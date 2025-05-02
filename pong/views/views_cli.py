from pong.serializers.serializers_cli import GamePlayerUpdateSerializer
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from pong.serializers.game import GameSerializer
from rest_framework import generics
from rest_framework import status
from pong.models.game import Game
import logging

# logger = logging.getLogger(__name__)

class GamePlayersUpdateView(generics.UpdateAPIView):

    queryset = Game.objects.all()
    serializer_class = GamePlayerUpdateSerializer
    lookup_field = 'game_id'
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Pour retourner les données complètes du jeu mis à jour
        result_serializer = GameSerializer(instance)
        return Response(result_serializer.data)


class ActiveGamesView(APIView):
    """
    Vue qui retourne tous les jeux actifs.
    """
    def get(self, request, format=None):

        # logger.info("Getting all active games.")

        # Récupérer tous les jeux avec is_active=True
        active_games = Game.objects.filter(is_active=True)
        
        # logger.info(f"Found {len(active_games)} active games.")

        # Sérialiser les données
        serializer = GameSerializer(active_games, many=True)
        
        # Retourner la réponse avec un message explicite si la liste est vide
        if not active_games.exists():
            print("Aucun jeu actif trouvé.")
            return Response({
                'active_games': [],
                'message': 'Aucun jeu actif trouvé.'
            }, status=status.HTTP_200_OK)
        
        # Sinon, retourner les données normalement
        return Response({
            'active_games': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)


class UpdateGameStatusView(APIView):
    
    def post(self, request, game_id):
        try:
            # Récupérer l'objet Game correspondant au game_id
            game = get_object_or_404(Game, game_id=game_id)
            
            # Appeler la méthode set_game_active
            game.set_game_active()
            
            # Retourner une réponse de succès
            return Response({
                'success': True,
                'message': f'Game {game_id} status updated to active',
                'game': {
                    'game_id': game.game_id,
                    'is_active': game.is_active,
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            # En cas d'erreur, retourner une réponse d'erreur
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
