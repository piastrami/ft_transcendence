from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import status

from django.db.models import Q
from django.db import models

from authentication.models.User import User
from chat.models.ChatRoom import ChatRoom

# Chat Room API
class ChatRoomListCreateAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_username = request.user.username  # Get the authenticated user's username
        friend_username = request.query_params.get('friendUsername')

        if not friend_username:
            return Response({'error': 'Friend username is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the current user and friend exist
        users = User.objects.filter(username__in=[current_username, friend_username])

        if users.count() != 2:
            return Response({'error': 'One or both users not found'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the chat room name, ensuring the order is consistent
        participants = sorted(users, key=lambda user: user.username)
        room_name = f"{participants[0].username}_{participants[1].username}"

        # Try to find an existing room with these two participants
        chat_room = ChatRoom.objects.filter(name=room_name).first()

        if not chat_room:
            return Response({'error': 'Room does not exist'}, status=status.HTTP_404_NOT_FOUND)
            # return Response({'error': 'Room does not exist'}, status=status.HTTP_200_OK)

        return Response({
            'room_id': chat_room.id,
            'room_name': chat_room.name,
            'participants': [user.username for user in participants]
        }, status=status.HTTP_200_OK)

   

    def post(self, request):
        current_username = request.user.username
        friend_username = request.data.get('friendUsername')

        if not friend_username:
            return Response({'error': 'Friend username is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the current user and friend exist
        users = User.objects.filter(username__in=[current_username, friend_username])

        if users.count() != 2:
            return Response({'error': 'One or both users not found'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the chat room name, ensuring the order is consistent
        participants = sorted(users, key=lambda user: user.username)
        room_name = f"{participants[0].username}_{participants[1].username}"

        # Try to find an existing room with these two participants
        chat_room = ChatRoom.objects.filter(name=room_name).first()

        if not chat_room:
            # If no existing room, create a new onefrom django.db.models import Max
            chat_room = ChatRoom(name=room_name)
            chat_room.save()
            chat_room.add_participants(participants)  # Add the participants to the new room

        return Response({
            'room_id': chat_room.id,
            'room_name': chat_room.name,
            'participants': [user.username for user in participants]
        }, status=status.HTTP_201_CREATED)

