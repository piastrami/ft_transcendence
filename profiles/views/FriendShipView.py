from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication


from django.shortcuts import get_object_or_404
from django.db import models

from authentication.models import User
from notifications.models.FriendRequest import FriendRequest
from profiles.models.FriendShip import Friendship
from profiles.serializers.FriendShipSerializer import FriendshipSerializer


# import logging
# logger = logging.getLogger(__name__)


class FriendshipView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, username=None):
        #logger.info("""List all friendships of the authenticated user""")
        user = request.user

        # If a username is provided, filter by that username
        if username:
            user = get_object_or_404(User, username=username)
        #logger.info(f"user in get:, {username}")
        friendships = Friendship.objects.filter(user1=user)  # Only show friendships where user1 is the authenticated user
        #logger.info(f"friendship in get:, {friendships}")
        
        # if not friendships:
        #     friendships = Friendship.objects.filter(user2=user)  # Only show friendships where user1 is the authenticated user

        # Get friendships where the user is either user1 or user2
        # friendships = Friendship.objects.filter(
        #     models.Q(user1=user) | models.Q(user2=user)
        # )

        serializer = FriendshipSerializer(friendships, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    #i dont use this request
    def post(self, request):
        #logger.info("""Accept a pending friend request and create a friendship""")

        notification_id = request.data.get('notification_id')
        #logger.info(f"Notification ID: {notification_id}")
        try:
            # friend_request = FriendRequest.objects.get(receiver=request.user, accepted=False)
            friend_request = FriendRequest.objects.get(id=notification_id, accepted=False)
        except FriendRequest.DoesNotExist:
            return Response({"error": "No pending friend requests"}, status=status.HTTP_400_BAD_REQUEST)

        # Create a friendship if request is accepted
        # friendship = Friendship(user1=friend_request.sender, user2=request.user)
        # friendship.save()
        sender = friend_request.sender
        receiver = request.user

        # Check if (sender -> receiver) friendship exists, create it if not
        if not Friendship.objects.filter(user1=sender, user2=receiver).exists():
            Friendship.objects.create(user1=sender, user2=receiver)
            #logger.info(f"Created friendship: {sender} → {receiver}")

        # Check if (receiver -> sender) friendship exists, create it if not
        if not Friendship.objects.filter(user1=receiver, user2=sender).exists():
            Friendship.objects.create(user1=receiver, user2=sender)
            #logger.info(f"Created friendship: {receiver} → {sender}")


        # Create two friendship records (bidirectional)
        # Friendship.objects.create(user1=friend_request.sender, user2=request.user)
        # Friendship.objects.create(user1=request.user, user2=friend_request.sender)



        # Mark the friend request as accepted
        friend_request.delete()

        return Response({"message": "Friend request accepted and deleted the request from db"}, status=status.HTTP_201_CREATED)

    def delete(self, request, username):
        #logger.info("""Remove a user from the friend list""")
        
        user_to_remove = get_object_or_404(User, username=username)
        ######## remove the friendship in 2 sides ########
        friendship = Friendship.objects.filter(
            (models.Q(user1=request.user) & models.Q(user2=user_to_remove)) |
            (models.Q(user1=user_to_remove) & models.Q(user2=request.user))
        )

        ######## remove the friendship in 1 sides ########

        # friendship = Friendship.objects.filter(
        #     (models.Q(user1=request.user) & models.Q(user2=user_to_remove))
        # ).first()

        if friendship:
            # logger.info("""delete a user from the friend list""")

            friendship.delete()
            return Response({"message": "Friend removed successfully"}, status=status.HTTP_200_OK)
        
        #logger.info("""error": "Friendship not found""")
        return Response({"error": "Friendship not found"}, status=status.HTTP_404_NOT_FOUND)



class FriendshipInBlockView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, username):
        # logger.info("""Remove a user from the friend list""")
        
        user_to_remove = User.objects.filter(username=username).first()
        
        ######## remove the friendship in 1 sides ########
        if (user_to_remove):
            friendship = Friendship.objects.filter(
                (models.Q(user1=request.user) & models.Q(user2=user_to_remove))
            ).first()

        if friendship:
            # logger.info("""delete a user from the friend list""")

            friendship.delete()
            return Response({"message": "Friend removed successfully"}, status=status.HTTP_200_OK)
        
        # logger.info("""error": "Friendship not found""")
        # return Response({"error": "Friendship not found"}, status=status.HTTP_404_NOT_FOUND)
        # logger.info("Friendship not found")
        # Return a 200 OK instead of a 404 to avoid a 404 error on the frontend
        return Response({"message": "User is not in the friendship list"}, status=status.HTTP_200_OK)




