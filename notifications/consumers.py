import json
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from authentication.models.User import User
from django.db import IntegrityError
from notifications.models.FriendRequest import FriendRequest
from profiles.models.FriendShip import Friendship

from profiles.models.BlockedUser import BlockedUser
from notifications.models.GameRequestNotif import GameRequestNotif
from chat.models.Message import Message

from channels.db import database_sync_to_async
from django.db import models
from django.db.models import Q
from django.utils.timezone import now

import redis
# Redis connection
redis_client = redis.StrictRedis(host='redis', port=6379, db=0, decode_responses=True)

import logging
logger = logging.getLogger(__name__)


@database_sync_to_async
def save_game_request(game_id, inviter_username, recipient_username, request_status, game_type, message):
    try:
        inviter = User.objects.get(username=inviter_username)
        recipient = User.objects.get(username=recipient_username)

        # logger.info(f"gameID in save_game_request(): {game_id}")


        # Save a new game request if none exists
        game_request = GameRequestNotif(
            inviter=inviter,
            recipient=recipient,
            status=request_status,
            game_type=game_type,
            game_id=game_id,
            message=message,
        )
        game_request.save()
        # logger.info(f"Game request saved: {inviter_username} -> {recipient_username}")

    except User.DoesNotExist:
        pass
        # logger.info("User not found")

    except IntegrityError:
        pass
        # logger.info("IntegrityError: Duplicate game request detected.")

class NotificationConsumer(AsyncWebsocketConsumer):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    async def connect(self):
        self.user = self.scope["user"]
        # logger.info(f"User {self.user} connected to notifications COMNSUMER")

        if self.user.is_authenticated:
            self.room_group_name = f"notifications_{self.user.username}"
            # logger.info(f"Group name to send notification is_auth: {self.room_group_name}")


            ############################# ONLINE STAUS ############################## 
            # ✅ Save user to Redis set
            redis_client.set(f"user_online:{self.user.username}", "online")  # No TTL (persistent)


            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.channel_layer.group_add("global_notifications", self.channel_name)

            await self.accept()
            # logger.info(f"User {self.user} connected and marked online.")
            # Broadcast to all connected users
            await self.channel_layer.group_send(
                "global_notifications",  # Group name for all users
                {
                    "type": "user_online",
                }
            )

        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            ############################# ONLINE STAUS ############################## 

            # logger.info(f"User {self.user} disconnected from notifications CONSUMER")
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            await self.channel_layer.group_discard("global_notifications", self.channel_name)

            # ✅ Remove user from Redis
            redis_client.delete(f"user_online:{self.user.username}")

            # Broadcast to all connected users
            await self.channel_layer.group_send(
                "global_notifications",  # Group name for all users
                {
                    "type": "user_online",
                }
            )

    async def receive(self, text_data):

        data = json.loads(text_data)
        message_type = data.get("type")
        # logger.info(f"Received message of type {message_type}")

        if message_type == "friend_request":
            await self.handle_friend_request(data)
        elif message_type == "friend_request_response":
            await self.handle_friend_request_response(data)
        elif message_type == "game_request":
            await self.handle_game_request(data)


    async def unread_message(self, data):
        sender = data.get("friend_name")
        # logger.info(f"\033[91mHandle unread_message notification in consumer : {sender}\033[0m")
        await self.send(text_data=json.dumps({
            "type": "unread_msg",
            "sender": sender,
        }))
        if (sender):
            # Update messages directly in the database
            await self.mark_messages_unread(sender)
         


    async def gameNotif(self, data):
        # logger.info("""Handle deleted game notification""")
        sender = data.get("friend_name")
        await self.send(text_data=json.dumps({
            "type": "update_game_notif",
            "sender": sender,
        }))
            

    @database_sync_to_async
    def mark_messages_unread(self, senderName):
        sender = User.objects.get(username=senderName)
        # logger.info(f"\033[91mUpdate the 'read' field to false. \033[0m")
        # return Message.objects.filter(user=sender, read=True).update(read=False)
        return Message.objects.filter(user=sender, read=False).update(read=True)
    
    
    #friend response
    async def handle_friend_request_response(self, data):
        # logger.info("""Handle the response to a friend request (Accept or Reject).""")
        receiver = self.user  # The user who received the friend request
        sender_name = data.get("friend_name")
        response = data.get("response")

        try:
            sender = await database_sync_to_async(User.objects.get)(username=sender_name)
        except User.DoesNotExist:
            await self.send(text_data=json.dumps({"error": "Sender not found"}))
            return

        try:
            friend_request = await database_sync_to_async(FriendRequest.objects.get)(sender=sender, receiver=receiver)
        except FriendRequest.DoesNotExist:
            await self.send(text_data=json.dumps({"error": "Friend request not found"}))
            return

        if response == "accept":
            # # Check if the friendship already exists in either direction
            existing_friendship = await database_sync_to_async(
                lambda: Friendship.objects.filter(
                    (models.Q(user1=sender, user2=receiver))
                ).exists()
            )()
            if not existing_friendship:
                # Create friendship in both directions
                await database_sync_to_async(Friendship.objects.create)(user1=sender, user2=receiver)
                # logger.info({"Friendship created successfully"})
            # else:
                # logger.info({"Friendship already exists"})

            existing_friendship = await database_sync_to_async(
                lambda: Friendship.objects.filter(
                    (models.Q(user1=receiver, user2=sender))
                ).exists()
            )()
            if not existing_friendship:
                # Create friendship in both directions
                await database_sync_to_async(Friendship.objects.create)(user1=receiver, user2=sender)
                # logger.info({"Friendship created successfully"})
            # else:
                # logger.info({"Friendship already exists"})

            await database_sync_to_async(friend_request.delete)()  # Remove the pending request



        elif response == "reject":
            # Just delete the friend request
            await database_sync_to_async(friend_request.delete)()




    async def user_online(self, event):
        # logger.info("""Send online status message to all users in the group""")
        await self.send(text_data=json.dumps({
            "type": "online",
        }))
    
    #friend request
    async def handle_friend_request(self, data):
        """Handle friend request logic"""
        # logger.info("handle_friend_request() called in notifconsumers")
        sender = self.user  # The user sending the request
        friend_name = data.get("friend_name")
        # logger.info(f"friend_name:  {friend_name}")
        # logger.info(f"sender:  {sender}")

        try:
            receiver = await database_sync_to_async(User.objects.get)(username=friend_name)
        except User.DoesNotExist:
            await self.send(text_data=json.dumps({"error": "User not found"}))
            # logger.info("User not found")
            return

        # Check if they are already friends
        exists = await database_sync_to_async(lambda: Friendship.objects.filter(
            user1=sender, user2=receiver
        ).exists() and Friendship.objects.filter(user1=receiver, user2=sender).exists())()
        if exists:
            await self.send(text_data=json.dumps({"error": "Already friends"}))
            # logger.info("Already friends")
            return

        # Create a FriendRequest object (if it doesn't already exist)
        try:
            friend_blocked = await self.is_user_blocked(sender.username, friend_name)
            if not friend_blocked:
                 # Notify the receiver via WebSocket
                await self.channel_layer.group_send(
                    f"notifications_{friend_name}",
                    {
                        "type": "send_notification",
                        "message": f"{friend_name}, {sender.username} sent you a friend request!",
                        "sender": sender.username
                    }
                )
                friend_request, created = await database_sync_to_async(
                    FriendRequest.objects.get_or_create
                )(sender=sender, receiver=receiver, message=f"{receiver.username}, {sender.username} sent you a friend request!")

                if not created:
                    await self.send(text_data=json.dumps({"error": "Friend request already sent"}))
                else:
                    logger.info(f"Group name to send notification: notifications_{friend_name}")
                    # logger.info("Friend request already sent")
            # else:
            #     logger.info("Could not receive friend request, Friend is blocked")

        except IntegrityError:
            await self.send(text_data=json.dumps({"error": "Could not send friend request"}))
            # logger.info("Could not send friend request")



    #Game Request
    async def handle_game_request(self, data):
        # logger.info("""Handle game request logic""")
        sender = self.user  # The user sending the request
        friend_name = data.get("friend_name")
        game_type = data.get("game_type")
        game_id = data.get("game_id")
        # logger.info(f"friend_name:  {friend_name}")
        # logger.info(f"game_type:  {game_type}")
        # logger.info(f"game_id:  {game_id}")
        # logger.info(f"sender:  {sender}")

        #check if reciever exists
        try:
            receiver = await database_sync_to_async(User.objects.get)(username=friend_name)
        except User.DoesNotExist:
            await self.send(text_data=json.dumps({"error": "User not found"}))
            # logger.info("User not found")
            return
        if game_type == "pong":
            message = f"{receiver}, Let's play some pong with {sender}!"
        elif game_type.lower() == "tournament":
            message = f"{receiver}, Join {sender}'s tournament!"
        
        # Create a gameNotif object (if it doesn't already exist) and send a notification
        try:
            #if i save in backend my notif update its not correct
            # await save_game_request(game_id, sender, receiver, 'pending', game_type, message)

            # logger.info(f"Group name to send notification: notifications_{friend_name}")
            # Notify the receiver via WebSocket
            await self.channel_layer.group_send(
                f"notifications_{friend_name}",
                {
                    "type": "send_game_notification",
                    "message": message,
                    "sender": sender.username,
                    "receiver": receiver.username,
                    "game_type": game_type,
                    "game_id": game_id,
                    'request_status': 'pending',
                }
            )

        except IntegrityError:
            await self.send(text_data=json.dumps({"error": "Could not send game request"}))
            # logger.info("Could not send game request")

    async def send_game_notification(self, event):
        # logger.info("""Send a game notification to the receiver""")
        await self.send(text_data=json.dumps({
            "type": "game_invite_notif",
            "message": event["message"],
            "sender": event["sender"],
            "receiver": event["receiver"],
            "game_type": event["game_type"],
            "game_id": event["game_id"],
            "request_status": event["request_status"],
        }))



    async def send_notification(self, event):
        # logger.info("""Send a friend notification to the receiver""")
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "sender": event["sender"],
            "type": "friend_request_notif",
        }))

    async def send_response(self, event):
        # logger.info("""Send a friend response notification to the receiver in frontend(NotifWebsocket)""")
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "sender": event["sender"],
            "type": "friend_request_response",
        }))
    


    @database_sync_to_async
    def is_user_blocked(self, sender, friend_name):
        """
        Check if the sender is blocked by the other user in the chat, based on the 'is_active' flag.
        """
        try:
            
            # Retrieve the User objects for both the sender and recipient
            sender_user = User.objects.get(username=sender)
            recipient_user = User.objects.get(username=friend_name)

            # Check if the sender is blocked by the recipient or if the recipient is blocked by the sender
            block_entry = BlockedUser.objects.filter(
                (Q(user=sender_user, blocked_user=recipient_user) & Q(is_active=True)) |
                (Q(user=recipient_user, blocked_user=sender_user) & Q(is_active=True))
            ).first()

            # If there's a block entry, return True (blocked), otherwise False
            return block_entry is not None

        except Exception as e:
            return False  # Default to not blocked if an error occurs



    async def handle_update_notification(self, event):
        # logger.info("""update notification """)
        await self.send(text_data=json.dumps({
            "type": event["event"],
            "id": event["id"],    
        }))
