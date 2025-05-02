from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from authentication.models import User
from notifications.models.FriendRequest import FriendRequest
from notifications.serializers.FriendRequestSerializer import FriendRequestSerializer


import logging
logger = logging.getLogger(__name__)

class FriendRequestView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        #logger.info("FriendRequestView GET request received!")
        try:
            # Log the query result size
            pending_requests = FriendRequest.objects.filter(accepted=False)
            #logger.info(f"Found {len(pending_requests)} pending friend requests.")
            
            # If no requests are found, log it
            #if not pending_requests:
                #logger.warning("No pending friend requests found.")

            serializer = FriendRequestSerializer(pending_requests, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            #logger.error(f"Error fetching friend requests: {e}")
            return Response({"error": "Internal Server Error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def delete(self, request):
            """Cancel a pending friend request based on notification_id"""
            notification_id = request.data.get('notification_id')
            #logger.info(f"Notification ID: {notification_id}")
            
            if not notification_id:
                return Response({"error": "Notification ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Get the FriendRequest by notification_id, assuming notification_id is a field in the model
                friend_request = FriendRequest.objects.get(id=notification_id, accepted=False)
                
                # Check if the user is either the sender or receiver of the friend request
                if friend_request.sender != request.user and friend_request.receiver != request.user:
                    return Response({"error": "You can only delete your own friend requests"}, status=status.HTTP_403_FORBIDDEN)

            except FriendRequest.DoesNotExist:
                return Response({"error": "Friend request not found or already accepted/rejected"}, status=status.HTTP_404_NOT_FOUND)

            # If found, delete the friend request
            friend_request.delete()
            return Response({"message": "Friend request canceled successfully"}, status=status.HTTP_204_NO_CONTENT)

    def post(self, request):
        #logger.info("""Send a friend request""")
        receiver = request.data.get("receiver")

        if not receiver:
            return Response({"error": "Receiver ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(username=receiver)

            # Prevent sending a friend request to yourself
            if request.user == receiver:
                return Response({"error": "You cannot send a friend request to yourself"}, status=status.HTTP_400_BAD_REQUEST)

            # Check if a friend request already exists
            if FriendRequest.objects.filter(sender=request.user, receiver=receiver, accepted=False).exists():
                return Response({"error": "Friend request already sent"}, status=status.HTTP_400_BAD_REQUEST)

            # Create a new friend request
            friend_request = FriendRequest.objects.create(
                sender=request.user,
                receiver=receiver,
                message=f"{receiver.username}, {request.user.username} sent you a friend request!"
            )

            return Response(
                {"message": "Friend request sent successfully", "friend_request_id": friend_request.id},
                status=status.HTTP_201_CREATED
            )

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


