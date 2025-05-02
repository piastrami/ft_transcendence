from rest_framework import serializers
from pong.models.tournament import Tournament, TournamentPlayer, TournamentGame, TournamentStatus
from profiles.models.UserProfile import UserProfile
from pong.models.game import Game
from pong.serializers.game import GameSerializer
from profiles.serializers.UserProfileSerializer import UserProfileSerializer

class TournamentPlayerSerializer(serializers.ModelSerializer):
    user_profile = UserProfileSerializer(read_only=True)
    class Meta:
        model = TournamentPlayer
        fields = ['id', 'user_profile', 'alias', 'joined_at']

class TournamentGameSerializer(serializers.ModelSerializer):
    game = GameSerializer(read_only=True)
    class Meta:
        model = TournamentGame
        fields = ['id', 'game', 'round', 'order', 'alias1', 'alias2']

class TournamentSerializer(serializers.ModelSerializer):
    creator = UserProfileSerializer(read_only=True)
    players = TournamentPlayerSerializer(many=True, read_only=True)
    tournament_games = TournamentGameSerializer(many=True, read_only=True)

    class Meta:
        model = Tournament
        fields = [
            'tournament_id', 'creator', 'max_players', 'status', 'is_active', 'date_created', 'date_completed',
            'players', 'tournament_games'
        ]
        