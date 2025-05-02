from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound
from django.db.models import Q

from profiles.models.BlockedUser import BlockedUser, BlockHistory
from profiles.serializers.BlockedUserSerializer import BlockedUserSerializer, BlockHistorySerializer
from authentication.models.User import User


import logging
#logger = logging.getLogger(__name__)

class BlockUserView(APIView):
    authentication_classes = [JWTAuthentication]  # Use JWT authentication
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Block a user"""
        user = request.user
        blocked_username = request.data.get('username')

        try:
            blocked_user = User.objects.get(username=blocked_username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if blocked_user == user:
            return Response({"error": "You cannot block yourself"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the block already exists
        blocked_user_instance, created = BlockedUser.objects.get_or_create(user=user, blocked_user=blocked_user)

        if not created:
            if blocked_user_instance.is_active:
                return Response({"message": f"User {blocked_user.username} is already blocked"})  # No new history entry

            # If the block exists but was previously deactivated, reactivate it and add to history
            blocked_user_instance.is_active = True
            blocked_user_instance.save()
            BlockHistory.create_block_history(blocked_user_instance, action_type='block')
            return Response({"message": f"{blocked_user.username} re-blocked successfully"})

        # Create block history record for a new block only
        BlockHistory.create_block_history(blocked_user_instance, action_type='block')

        return Response({"message": f"{blocked_user.username} blocked successfully"})


    def get(self, request, *args, **kwargs):
        #logger.info("""Get the list of blocked users""")
        user = request.user
        blocked_users = BlockedUser.objects.filter(user=user, is_active=True)
        serializer = BlockedUserSerializer(blocked_users, many=True)
        return Response(serializer.data)


    def delete(self, request, username, *args, **kwargs):
        user = request.user

        try:
            blocked_user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise NotFound("Blocked user not found.")

        try:
            blocked_user_instance = BlockedUser.objects.get(user=user, blocked_user=blocked_user, is_active=True)
        except BlockedUser.DoesNotExist:
            raise NotFound("This user is not blocked.")

        # Mark as unblocked instead of deleting
        blocked_user_instance.is_active = False
        blocked_user_instance.save()  # Now saving changes

        # Create unblock history record
        BlockHistory.create_block_history(blocked_user_instance, action_type='unblock')

        return Response({"message": f"{blocked_user.username} unblocked successfully"})


class BlockHistoryListView(APIView):
    authentication_classes = [JWTAuthentication]  # Use JWT authentication
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        blocked_user_instances = BlockedUser.objects.filter(user=user)
        block_history = BlockHistory.objects.filter(blocked_user__in=blocked_user_instances)
        serializer = BlockHistorySerializer(block_history, many=True)
        return Response(serializer.data)
    


# Then in your frontend code, create a simple endpoint to use this:

class CheckMutualBlockView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, username, *args, **kwargs):
        #logger.info("""Check if either the current user or the specified user has blocked the other""")
        current_user = request.user
        
        try:
            other_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        is_blocked = is_either_blocked(current_user, other_user)
        
        return Response({
            "is_blocked": is_blocked
        })
    
# Add a utility function to your models.py or utils.py
def is_either_blocked(user1, user2):
    # logger.info("""
    # Check if either user has blocked the other
    # Returns True if at least one user has blocked the other
    # """)
    return BlockedUser.objects.filter(
        (Q(user=user1) & Q(blocked_user=user2) & Q(is_active=True)) |
        (Q(user=user2) & Q(blocked_user=user1) & Q(is_active=True))
    ).exists()

