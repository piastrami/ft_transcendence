import json
from django.conf import settings
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from chat.models.Message import Message
from datetime import datetime

from channels.db import database_sync_to_async
from django.db.models import Q
from django.db import IntegrityError
from django.utils.timezone import now

from authentication.models.User import User
from chat.models.ChatRoom import ChatRoom
from profiles.models.BlockedUser import BlockedUser
from chat.models.GameRequest import GameRequest

import redis
# Redis connection
# redis_client = redis.StrictRedis(host='redis', port=6379, db=0, decode_responses=True)

# # Setup Redis connection
redis_client = redis.StrictRedis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

# TO DEBUG ##############################
import logging
logger = logging.getLogger(__name__)
########################################


@database_sync_to_async
def save_game_request(room, game_id, inviter_username, recipient_username, request_status, game_type):
    try:
        inviter = User.objects.get(username=inviter_username)
        recipient = User.objects.get(username=recipient_username)

        # logger.info(f"gameID: {game_id}")

        # Check for an existing pending game request
        existing_request = GameRequest.objects.filter(
            inviter=inviter, recipient=recipient, status='pending', game_type=game_type, game_id=game_id
        ).first()

        if existing_request:
            # Update the timestamp instead of creating a new request
            existing_request.created_at = now()
            existing_request.save()
            # logger.info(f"Updated timestamp of existing game request: {inviter_username} -> {recipient_username}")
            return  

        # Save a new game request if none exists
        game_request = GameRequest(
            room=room,
            inviter=inviter,
            recipient=recipient,
            status=request_status,
            game_type=game_type,
            game_id=game_id,
        )
        game_request.save()
        # logger.info(f"Game request saved: {inviter_username} -> {recipient_username}")

    except User.DoesNotExist:
        pass
        # logger.info("User not found")

    except IntegrityError:
        pass
        # logger.info("IntegrityError: Duplicate game request detected.")

class ChatConsumer(AsyncWebsocketConsumer):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    # Active users dictionary, mapping username to channel_name
    active_users = {}

    async def connect(self):
        self.user = self.scope["user"]
        # logger.info(f"Type of self.user: {type(self.user.username)}, Value: {self.user.username}")
        # logger.info(f"self.user in chatconsumer: {self.user}")
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.friend_name = self.scope["url_route"]["kwargs"]["username"]
        # logger.info(f'friend_name : {self.friend_name}')

        self.room_group_name = f"chat_{self.room_name}"
        # Fetch the chat room asynchronously
        room = await self.get_chat_room(self.room_name)

        # Check if the current user is authenticated and allowed in the room
        room_participants = await self.get_room_participants(room)

        try:
            # logger.info(f"self.channel_name: {self.channel_name}")
            # logger.info(f'self.room_name : {self.room_name}')

            # Extract usernames from room_name
            participant_usernames = self.room_name.split('_')

            if len(participant_usernames) != 2:
                raise ValueError("Invalid room name format")

            # Fetch both users asynchronously
            user_1 = await self.get_user_by_username(participant_usernames[0])
            user_2 = await self.get_user_by_username(participant_usernames[1])

            # logger.info(f"user_1: {user_1.username}")
            # logger.info(f"user_2: {user_2.username}")

            # Register this connection with the active users in the room
            if self.room_name not in ChatConsumer.active_users:
                ChatConsumer.active_users[self.room_name] = []

            ChatConsumer.active_users[self.room_name].append(self.channel_name)

            # Register this connection in Redis
            redis_key = f"active_in_room:{self.room_name}"
            await self.register_connection(redis_key, self.user.username)

            if {user_1.username, user_2.username} == set(room_participants):
                await self.channel_layer.group_add(self.room_group_name,self.channel_name,)
                await self.accept()
            else:
                await self.close()

        except Exception as e:
            # logger.info(f"error:", e)
            await self.close()

    async def register_connection(self, key, user):
        # Use async Redis client or sync with async_to_sync wrapper
        redis_client.sadd(key, user)

    async def disconnect(self, close_code):
        # logger.info(f"Disconnected with close_code: {close_code}")
        # Remove the user from active_rooms when they disconnect
        if self.room_name in ChatConsumer.active_users:
            ChatConsumer.active_users[self.room_name].remove(self.channel_name)
            if not ChatConsumer.active_users[self.room_name]:
                del ChatConsumer.active_users[self.room_name]
        # logger.info(f"active_users after disconnect: {ChatConsumer.active_users}")

        # Remove the user from the Redis set
        redis_key = f"active_in_room:{self.room_name}"
        redis_client.srem(redis_key, self.user.username)

        await self.channel_layer.group_discard(self.room_group_name,self.channel_name,)
        # logger.info(f"self.channel_name after disconnect: {self.channel_name}")



    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        message = text_data_json["message"]
        sender = text_data_json["username"]
        to = text_data_json.get('friendName')
        game_type = text_data_json.get('game_type')
        # read_status = text_data_json.get('read_status')

        friend = await self.get_user_by_username(to)
        # Check if the recipient has blocked the friendName
        friend_blocked = await self.is_user_blocked(friend)
        if message_type == 'message':
            request_status = 'none'


            # Check if both users are connected using Redis
            redis_key = f"active_in_room:{self.room_name}"
            active_users = redis_client.smembers(redis_key)
            # Check if both participants are connected
            # both_connected = len(active_users) == 2 #true or false
            both_connected = False
            if friend_blocked:
                # logger.info(f"\033[95mfriend_blocked: \033[0m")
                both_connected = True
            else :
                both_connected = len(active_users) == 2


            # save the message to the database
            saved_message = Message(
                room=await self.get_chat_room(self.room_name),
                user=await self.get_user_by_username(sender),
                content=message,
                read=both_connected,  # Mark as read if both are in the room
                message_type='message',
                request_status='none',
                game_type='none'
            )
            await database_sync_to_async(saved_message.save)()

            if friend_blocked:
                await self.send(text_data=json.dumps({
                "username": sender,
                "message": message,
                "timestamp": str(datetime.now()),
                "request_status": request_status,
                "game_type": 'none',
                
            }))
            else:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "message": message,
                        "username": sender,
                        "timestamp": str(datetime.now()),
                        "request_status": request_status,
                        "game_type": 'none',
                    },
                )

                
        elif message_type == 'game_request':
            game_id = text_data_json.get('gameId')
            # logger.info(f"game_id: {game_id}")
            # Handle the friend request logic here
            room = await self.get_chat_room(self.room_name)
            recipient_channel = None
            sender_channel = None

            # Find the correct recipient based on active users in this room
            for channel in ChatConsumer.active_users.get(self.room_name, []):
                if channel != self.channel_name:
                    recipient_channel = channel  # Other user in the room
                else:
                    sender_channel = channel  # Current user's channel
            if friend_blocked:
                if sender_channel:
                    message = f"You have invited {to} to play {game_type} Pong!"
                    await self.channel_layer.send(
                        sender_channel,
                        {
                            'type': 'chat_message',
                            'username': sender,
                            'message': message,
                            'timestamp': str(datetime.now()),
                            'request_status': 'for_sender',
                            'game_type':game_type,
                            'gameId': game_id,
                        }
                    )
            else:
                if recipient_channel:
                    # logger.info(f"Sending game request to {to} (channel: {recipient_channel})")
                    message = f"{to} i invite you to play {game_type} Pong!"
                    # Send the friend request directly to the recipient's channel
                    await self.channel_layer.send(
                        recipient_channel,
                        {
                            'type': 'chat_message',
                            'username': sender,
                            'message': message,
                            'timestamp': str(datetime.now()),
                            'request_status': 'pending',
                            'game_type':game_type,
                            'gameId': game_id,
                        }
                    )
                if sender_channel:
                    message = f"You have invited {to} to play {game_type} Pong!"
                    await self.channel_layer.send(
                        sender_channel,
                        {
                            'type': 'chat_message',
                            'username': sender,
                            'message': message,
                            'timestamp': str(datetime.now()),
                            'request_status': 'for_sender',
                            'game_type':game_type,
                            'gameId': game_id,
                        }
                    )


            # Save invite request to the database
            room = await self.get_chat_room(self.room_name)
            message1 = f"You have invited {to} to play {game_type} Pong!"
            # message1 = f"You have invited {to} to play {game_type} Pong with id {game_id}!"
            user1 = await self.get_user_by_username(sender)
            invite_message = Message(
                room=room,
                user=user1,
                content=message1,
                message_type='game_request',
                request_status='for_sender',
                game_type=game_type,
                game_id=game_id
            )
            await database_sync_to_async(invite_message.save)()

            if not friend_blocked:
                message = f"{to} I invite you to play {game_type} Pong!"
                user = await self.get_user_by_username(to)
                await database_sync_to_async(invite_message.save)()
                invite_message = Message(
                    room=room,
                    user=user,
                    content=message,
                    message_type='game_request',
                    request_status='pending',
                    game_type=game_type,
                    game_id=game_id
                )
                await database_sync_to_async(invite_message.save)()
            room = await self.get_chat_room(self.room_name)
            await save_game_request(room, game_id, sender, to, 'pending', game_type)


    async def chat_message(self, event):
        # logger.info(f"in chat_message")
        message = event["message"]
        username = event["username"]
        timestamp = event["timestamp"]
        request_status = event["request_status"] 
        game_type = event["game_type"]
        gameId = event.get('gameId')

        await self.send(text_data=json.dumps({
            "username": username,
            "message": message,
            "friendName": self.friend_name,
            "timestamp": timestamp,
            "request_status": request_status,
            "game_type": game_type,
            "gameId": gameId
        }))


    @database_sync_to_async
    def get_chat_room(self, room_name):
        try:
            room = ChatRoom.objects.get(name=room_name)
            return room
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def get_user_by_username(self, username):
        try:
            user = User.objects.get(username=username)
            return user
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def get_room_participants(self, room):
        return list(room.participants.values_list("username", flat=True))

    @database_sync_to_async
    def is_user_blocked(self, sender):
        """
        Check if the sender is blocked by the other user in the chat, based on the 'is_active' flag.
        """
        try:
            participant_usernames = self.room_name.split("_")
            if len(participant_usernames) != 2:
                return False  # Invalid room format, fail-safe

            # Find the recipient username (the other user in the chat)
            recipient_username = (
                participant_usernames[1]
                if sender.username == participant_usernames[0]
                else participant_usernames[0]
            )
            
            # Retrieve the User objects for both the sender and recipient
            sender_user = User.objects.get(username=sender)
            recipient_user = User.objects.get(username=recipient_username)

            # Check if the sender is blocked by the recipient or if the recipient is blocked by the sender
            block_entry = BlockedUser.objects.filter(
                (Q(user=sender_user, blocked_user=recipient_user) & Q(is_active=True)) |
                (Q(user=recipient_user, blocked_user=sender_user) & Q(is_active=True))
            ).first()

            # If there's a block entry, return True (blocked), otherwise False
            return block_entry is not None

        except Exception as e:
            return False  # Default to not blocked if an error occurs
