from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import status

from django.shortcuts import get_object_or_404

from django.db.models import Q
from django.db import models

from authentication.models.User import User
from chat.models.ChatRoom import ChatRoom
from chat.models.Message import Message

from chat.serializers.MessageSerializer import MessageSerializer
from profiles.models.BlockedUser import BlockedUser, BlockHistory

# TO DEBUG ##############################
import logging
logger = logging.getLogger(__name__)
########################################


# ===========================================================================================================================
# Message API this is for creating and get GAME REQUEST feature
# ===========================================================================================================================

class MessageListCreateAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, room_name, *args, **kwargs):
        #logger.info("""Retrieve messages based on block/unblock history for both users in the chat.""")
        user = request.user
        chat_room = ChatRoom.objects.get(name=room_name)

        # Get all messages in the chat room, ordered by timestamp
        messages = Message.objects.filter(room_id=chat_room).order_by('timestamp')

        # Get all users in this chatroom (assuming private chat)
        chat_users = list(chat_room.participants.all())

        if len(chat_users) != 2:
            return Response({"error": "Invalid chat participants"}, status=status.HTTP_400_BAD_REQUEST)

        # Get block/unblock history where either user blocked the other
        blocks = BlockedUser.objects.filter(
            models.Q(user=chat_users[0], blocked_user=chat_users[1]) | 
            models.Q(user=chat_users[1], blocked_user=chat_users[0])
        ).values_list('user_id', 'blocked_user_id', 'is_active')

        # Fetch all block history entries related to these users
        block_history = BlockHistory.objects.filter(
            blocked_user__user_id__in=[chat_users[0].id, chat_users[1].id],
            blocked_user__blocked_user_id__in=[chat_users[0].id, chat_users[1].id]
        ).order_by('timestamp')

        visible_messages = []

        for message in messages:
            message_visible = True  # Assume visible by default

            for block in blocks:
                blocker_id, blocked_id, is_active = block

                # Check if message sender is blocked at that timestamp
                if (message.user_id == blocked_id and user.id == blocker_id) or (message.user_id == blocker_id and user.id == blocked_id):
                    block_actions = block_history.filter(blocked_user__user_id=blocker_id, blocked_user__blocked_user_id=blocked_id)

                    is_blocked = False
                    for action in block_actions:
                        if action.action_type == 'block' and message.timestamp >= action.timestamp:
                            is_blocked = True
                        elif action.action_type == 'unblock' and message.timestamp >= action.timestamp:
                            is_blocked = False

                    # Hide message if the sender was blocked and it's not their own message
                    if is_blocked and message.user_id != user.id:
                        message_visible = False
                        break 
            if message_visible:
                visible_messages.append(message)

        # Serialize messages
        serializer = MessageSerializer(visible_messages, many=True)
        return Response({"messages": serializer.data}, status=status.HTTP_200_OK)


    def post(self, request, room_name=None):
        logger.info(f"create message in db post request")

        try:
            # Fetch the room
            room = ChatRoom.objects.get(name=room_name)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

        # Extract the username and room from the request data
        username = request.data.get('username')
        content = request.data.get('content')
        read = request.data.get('read')
        logger.info(f"username in post: {username}")
        logger.info(f"content in post: {content}")
        logger.info(f"read in post: {read}")
        if isinstance(read, str):  
            read = read.lower() == 'true'  # Converts 'true' to True and everything else to False
                # Fetch the user based on the username
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        # Prepare the data for the serializer
        data = {
            'room': room.id,
            'user': user.id,# Pass the user ID, as the serializer expects a ForeignKey
            'content': content,
            'read': read,
        }

        # Pass the data to the serializer
        serializer = MessageSerializer(data=data)
        if serializer.is_valid():
            # Save the message, explicitly passing user and room
            serializer.save(user=user, room=room, read=read)
            logger.info(f"Saved message serializer data: {serializer.data}")  # Logs in the console
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # Return errors if the serializer is invalid
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def put(self, request, room_name, *args, **kwargs):
        #logger.info(f"Marking messages in room {room_name} as read it called from loadOldMessages")
        
        # Get current user and room
        user = request.user
        chat_room = get_object_or_404(ChatRoom, name=room_name)
        
        # Get all participants in the room
        participants = chat_room.participants.all()
        
        # Make sure this is a 2-person chat room
        if participants.count() != 2:
            return Response({"error": "This endpoint is for private chats only"}, 
                        status=status.HTTP_400_BAD_REQUEST)
        
        # Get the other user in the chat (not the current user)
        other_users = participants.exclude(id=user.id)
        if other_users.count() == 0:
            return Response({"error": "No other users found in this chat"}, 
                        status=status.HTTP_400_BAD_REQUEST)
        
        # Find all unread messages from other users to the current user
        unread_messages = Message.objects.filter(
            room=chat_room,
            user__in=other_users,
            read=False
        )
        
        # Mark all those messages as read
        updated_count = unread_messages.update(read=True)
        
        return Response({
            "message": f"{updated_count} messages marked as read in room {room_name}.",
        }, status=status.HTTP_200_OK)



# ===========================================================================================================================
# Check Unread Messages API this is for checking unread messages in the chat room
# ===========================================================================================================================
class CheckUnreadMessagesAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_user = request.user
        
        # Get all chat rooms where the current user is a participant
        # Using the ManyToManyField relationship in your ChatRoom model
        user_rooms = ChatRoom.objects.filter(participants=current_user)
        
        # Create a dictionary to track unread messages
        unread_dict = {}
        
        # For each room, check for unread messages from other participants
        for room in user_rooms:
            # Get other participants in this room (excluding current user)
            other_participants = room.participants.exclude(id=current_user.id)
            
            for other_user in other_participants:
                # Check if there are unread messages from this user in this room
                has_unread = Message.objects.filter(
                    room=room,
                    user=other_user,
                    read=False
                ).exists()
                
                if has_unread:
                    unread_dict[other_user.username] = True
        
        return Response(unread_dict, status=status.HTTP_200_OK)





# ===========================================================================================================================
# Update Message API this is for updating status of GAME REQUEST feature
# ===========================================================================================================================

class MessageUpdateAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, room_id, *args, **kwargs):
        room = get_object_or_404(ChatRoom, id=room_id)
        status_update = request.data.get("status")
        game_type = request.data.get("game_type")
        game_id = request.data.get("gameId")

        if status_update not in ["accepted", "rejected"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        game_request_message = Message.objects.filter(
            room=room,
            message_type="game_request",
            game_type=game_type,
            game_id=game_id,
            user=request.user,
            request_status__in=["accepted", "rejected", "pending"]
        ).order_by("-timestamp").first()

        # Check if a message was found
        if not game_request_message:
            return Response({"error": "No game request message found."}, status=status.HTTP_404_NOT_FOUND)

        game_request_message.request_status = status_update
        game_request_message.save()

        return Response({"message": f"Game request {status_update} successfully!"}, status=status.HTTP_200_OK)


class MessageAutoUpdateAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, *args, **kwargs):
        status_update = request.data.get("status")
        logger.info(f"status update in auto*****: {status_update}")


        game_id = request.data.get("gameId")
        logger.info(f"game_id in auto*****: {game_id}")

        if status_update not in ["accepted", "rejected", "autorejected"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        game_request_message = Message.objects.filter(
            game_id=game_id,
            # request_status__in=["pending", "accepted", "rejected"] #to change rejected to autotejected
            # request_status__in=["pending", "accepted"] #if it is rejected we dont change it

        ).order_by("-timestamp").first()

        # Check if a message was found
        if not game_request_message:
            return Response({"error": "No game request message found."}, status=status.HTTP_404_NOT_FOUND)

        if (game_request_message.request_status != "rejected"):
        # if (game_request_message.request_status == "pending"):
            game_request_message.request_status = status_update
        
        if (game_request_message.request_status == "autorejected"):
            game_request_message.content += "\nThis request was rejected automatically because you didn't join the game."

        game_request_message.save()

        return Response({"message": f"Game request {status_update} successfully!"}, status=status.HTTP_200_OK)
