from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q
import traceback  # Ajout pour le debug
from pong.models.game import Game
from pong.serializers.game import GameSerializer
from profiles.models.UserProfile import UserProfile

class GetGamesDatabyUserView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        try:
            # print("Username reçu dans l'URL:", username)
            
            # Récupérer le profil utilisateur
            user_profile = UserProfile.objects.get(user__username=username)
            # print("UserProfile:", user_profile)
            
            # Récupérer les jeux
            games = Game.objects.filter(
                Q(player1=user_profile) | Q(player2=user_profile),
                Q(player1_score=5) | Q(player2_score=5),
                winner__isnull=False
            ).order_by('-date')
            # print("Nombre de jeux trouvés:", games.count())
            
            # Sérialiser les données
            games_data = GameSerializer(games, many=True).data
            # print("Données sérialisées:", games_data)
            
            return Response(games_data)
            
        except Exception as e:
            # Afficher l'erreur complète dans les logs
            print("Erreur complète:")
            print(traceback.format_exc())
            
            return Response(
                {"error": str(e)},  # Renvoyer le message d'erreur réel
                status=500
            )