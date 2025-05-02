from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from rest_framework import status
from django.shortcuts import get_object_or_404
from authentication.models import User
from notifications.models.GameRequestNotif import GameRequestNotif
from notifications.serializers.GameRequestNotifSerializer import GameRequestNotifSerializer

# TO DEBUG ##############################
import logging
logger = logging.getLogger(__name__)
########################################


class GameRequestNotifAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # logger.info("""get request for GameRequestNotifAPIView()""")
        gameId = request.headers.get("X-GameId")  # Extract value from header
        # logger.info(f"GameId in header: {gameId}")
        pending_requests = GameRequestNotif.objects.filter(game_id=gameId)
        serializer = GameRequestNotifSerializer(pending_requests, many=True)
        return Response(serializer.data)

    def post(self, request):
        # logger.info("""post requst for gamenotification""")
        recipient_username = request.data.get('recipient_username', "").strip().lower()
        gameId = request.data.get('gameId')

        if not recipient_username:
            return Response({"error": "Recipient username is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(username__iexact=recipient_username)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user == recipient:
            return Response({"error": "You cannot invite yourself to a game."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if an existing pending request exists
        if GameRequestNotif.objects.filter(inviter=request.user, recipient=recipient, status='pending', game_id='game_id').exists():
            return Response({"error": "You have already sent an invitation to this user."}, status=status.HTTP_400_BAD_REQUEST)

        # Create a new game request
        game_request = GameRequestNotif.objects.create(inviter=request.user, recipient=recipient, status='pending')
        serializer = GameRequestNotifSerializer(game_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    
    def put(self, request):

        # logger.info("""Update the status of a game notif request (accept or reject).""")

        new_status = request.data.get("status")
        game_id = request.data.get("gameId")
        # logger.info(f"Game type in notif: {game_id}")


        try:
            game_request = GameRequestNotif.objects.get(recipient=request.user, game_id=game_id)

        except GameRequestNotif.DoesNotExist:
            return Response({"error": "Game request notif not found or not authorized"}, status=status.HTTP_404_NOT_FOUND)


        game_request.status = new_status
        game_request.save()

        return Response({"message": f"Game notif request {new_status} successfully"}, status=status.HTTP_200_OK)
    
    def delete(self, request):
        game_id = request.data.get("gameId")
        # logger.info(f"""Delete a game request notif by game ID: {game_id}""")
    
        if not game_id:
            return Response({"error": "Game ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            game_requests = GameRequestNotif.objects.filter(game_id=game_id)
            
            if not game_requests.exists():
                return Response({"message": "No request available to delete with this id"}, status=status.HTTP_200_OK)
            
            count = game_requests.count()
            
            game_requests.delete()
            
            return Response({"message": f"{count} game request notif(s) deleted successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            

class GameRequestNotifListAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # logger.info("""get request for GameRequestNotifListAPIView()""")
        current_user = request.user
        game_notifications = GameRequestNotif.objects.filter(recipient=current_user)
        serializer = GameRequestNotifSerializer(game_notifications, many=True)
        return Response(serializer.data)
    

class CreateGameRequestNotifAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]


    def post(self, request):
        # logger.info("Received POST request to create GameRequestNotif")

        # Extract data from request body
        recipient_username = request.data.get('recipient_username')
        game_type = request.data.get('game_type')
        game_id = request.data.get('game_id')
        message = request.data.get('message')
        game_status = request.data.get('status')

        # Validate inputs
        if not recipient_username or not game_type or not game_id:
            return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure recipient exists
        try:
            recipient = User.objects.get(username__iexact=recipient_username)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


        # Ensure there is no pending invitation already
        if GameRequestNotif.objects.filter(inviter=request.user, recipient=recipient, status=game_status, game_id=game_id).exists():
            return Response({"error": "You have already sent an invitation to this user."}, status=status.HTTP_400_BAD_REQUEST)

        # Create a new game request notification
        game_request = GameRequestNotif.objects.create(
            inviter=request.user,
            recipient=recipient,
            status=game_status,
            game_type=game_type,
            game_id=game_id,
            message=message
        )

        # Serialize the new notification and return the response
        serializer = GameRequestNotifSerializer(game_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
