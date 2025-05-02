from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from rest_framework import status
from django.shortcuts import get_object_or_404
from authentication.models import User
from chat.models.GameRequest import GameRequest
from chat.serializers.GameRequestSerializer import GameRequestSerializer

# TO DEBUG ##############################
import logging
logger = logging.getLogger(__name__)
########################################

class GameRequestAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # logger.info("""Get pending invitations for the logged-in user.""")
        gameId = request.headers.get("X-GameId")  # Extract value from header
        pending_requests = GameRequest.objects.filter(game_id=gameId)
        serializer = GameRequestSerializer(pending_requests, many=True)
        return Response(serializer.data)

    def post(self, request):
        # logger.info("""Send a game invitation to another user.""")
        recipient_username = request.data.get('recipient_username', "").strip().lower()

        if not recipient_username:
            return Response({"error": "Recipient username is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(username__iexact=recipient_username)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user == recipient:
            return Response({"error": "You cannot invite yourself to a game."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if an existing pending request exists
        if GameRequest.objects.filter(inviter=request.user, recipient=recipient, status='pending').exists():
            return Response({"error": "You have already sent an invitation to this user."}, status=status.HTTP_400_BAD_REQUEST)

        # Create a new game request
        game_request = GameRequest.objects.create(inviter=request.user, recipient=recipient, status='pending')
        serializer = GameRequestSerializer(game_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    
    def put(self, request, room_id):

        logger.info("""Update the status of a game request (accept or reject).""")
        new_status = request.data.get("status")
        game_type = request.data.get("game_type")
        game_id = request.data.get("gameId")
        # logger.info(f"Game type: {game_type}")
        # logger.info(f"Game type: {game_id}")


        try:
            game_request = GameRequest.objects.get(room_id=room_id, recipient=request.user, game_type=game_type, game_id=game_id)
        except GameRequest.DoesNotExist:
            return Response({"error": "Game request not found or not authorized"}, status=status.HTTP_404_NOT_FOUND)


        # if new_status not in ["accepted", "declined"]:
        #     return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        game_request.status = new_status
        game_request.save()

        return Response({"message": f"Game request {new_status} successfully"}, status=status.HTTP_200_OK)
    

class GameRequestAutoAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request):
        logger.info("""Update the status of a game request (accept or reject).
        """)
        new_status = request.data.get("status")
        game_id = request.data.get("gameId")
        logger.info(f"Game type: {game_id}")

        try:
            game_request = GameRequest.objects.get(game_id=game_id)
            # game_request = GameRequest.objects.get(game_id=game_id, status__in=["pending", "accepted"])

        except GameRequest.DoesNotExist:
            return Response({"error": "Game request not found"}, status=status.HTTP_404_NOT_FOUND)

        # if new_status not in ["accepted", "declined"]:
        #     return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        
        if (game_request.status != "rejected"):
        # if (game_request.status == "pending"):
            game_request.status = new_status
        game_request.save()

        return Response({"message": f"Game request {new_status} successfully"}, status=status.HTTP_200_OK)
