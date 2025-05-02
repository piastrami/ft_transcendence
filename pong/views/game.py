from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from pong.serializers.game import GameSerializer
from pong.models.game import Game
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from authentication.models import User
from rest_framework.exceptions import ValidationError
import uuid
import logging
from utils.handleExceptionsFromServer import handle_exception
from notifications.models.GameRequestNotif import GameRequestNotif
# Create a logger for your module
# logger = logging.getLogger(__name__)

import os

class GetIpView(APIView):
    
    def get(self, request):
        host_ip = os.environ.get('HOST_IP', request.get_host().split(':')[0])
        return Response({'ip': host_ip})

class NewGame(APIView):
    # garder ici le allowany pour le api cli pong
    permission_classes = [AllowAny]
    serializer_class = GameSerializer
    
    def get(self, request, game_id):
        try:
            if game_id:
                game = Game.objects.get(game_id=game_id)
                serializer = GameSerializer(game)
                return Response(serializer.data)
            else:
                return Response({'error': 'Please provide game ID'}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            formatted_errors = {}
            for field, messages in e.detail.items():
                formatted_errors[field] = ", ".join(messages)
            return Response({
                'status': 'error',
                'message': formatted_errors,
            }, status=status.HTTP_400_BAD_REQUEST)
        except Game.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Game was cancelled or does not exist',
            }, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, game_id):
        # logger.info(f"NewGame POST request: {request.data}")
        serializer = GameSerializer(data=request.data)
        try:
            if serializer.is_valid(raise_exception=True):
                # logger.info(f"Serializer data: {serializer.validated_data}")
                serializer.save()
                game_data = serializer.data
                # if serializer.data has game_id, it's an update and message needs to change
                return Response({
                    'data': game_data,
                    'message': 'Game session successfully created'
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return handle_exception(e)
        
    def delete(self, request, game_id):
        try:
            game = Game.objects.get(game_id=game_id)
            game.delete()
            # Delete the game request notification if it exists
            try:
                game_request = GameRequestNotif.objects.get(game_id=game_id)
                game_request.delete()
                return Response({'message': 'Game session and corresponding notif successfully deleted'}, status=status.HTTP_200_OK)
            except GameRequestNotif.DoesNotExist:
                return Response({'message': 'Game session successfully deleted'}, status=status.HTTP_200_OK)
        except Game.DoesNotExist:
            return Response({'error': 'Game session does not exist'}, status=status.HTTP_404_NOT_FOUND)
   
class GameUpdate(APIView):
     # garder ici le allowany pour le api cli pong
    permission_classes = [AllowAny]
    serializer_class = GameSerializer

    def put(self, request, game_id):
        # logger.info("put request in game update")
        try:
            game = Game.objects.get(game_id=game_id)
            serializer = GameSerializer(game, data=request.data, partial=True)
            if serializer.is_valid(raise_exception=True):
                serializer.save()
                game_data = serializer.data
                return Response({
                    'data': game_data,
                    'message': 'Game session successfully updated'
                }, status=status.HTTP_200_OK)
        
        except Game.DoesNotExist:
            return Response({'error': 'Game session does not exist'}, status=status.HTTP_404_NOT_FOUND)

class genUniqueIDView(APIView):

    def get(self, request):
        game_id = f"{str(uuid.uuid4())[:8]}"
        return Response({'game_id': game_id})
