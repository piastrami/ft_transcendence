from rest_framework import serializers
from pong.models.game import Game
from profiles.serializers.UserProfileSerializer import UserProfileSerializer
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from authentication.models.User import User
from profiles.models.UserProfile import UserProfile

# import logging
# logger = logging.getLogger(__name__)

class GameSerializer(serializers.ModelSerializer):
    player1 = UserProfileSerializer(required=False)
    player2 = UserProfileSerializer(required=False)
    winner = UserProfileSerializer(required=False)
    player1_username = serializers.CharField(max_length=255, required=False)
    player2_username = serializers.CharField(max_length=255, required=False)
    current_user = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = Game
        fields = ['game_id', 'mode', 'player1', 'player2', 'player1_username', 'player2_username', 'winner', 'player1_score', 'player2_score', 'is_active', 'date', 'current_user']

    game_id = serializers.CharField(max_length=8, required=True)

    def get(self, validated_data): # GET
        try:
            game = Game.objects.get(game_id=validated_data.get('game_id'))
            return game
        except Game.DoesNotExist:
            raise ValidationError("Game session does not exist")

    def create(self, validated_data): # POST
    
        try:
            game_id = validated_data.pop('game_id')
            if game_id is None:
                raise serializers.ValidationError("Game ID cannot be empty")
            mode = validated_data.pop('mode')
            if mode is None: 
                raise serializers.ValidationError("Mode cannot be empty")
        except KeyError as e:
            raise serializers.ValidationError(e)
        
        # Handle player1 and player2 usernames
        player1_username = validated_data.pop('player1_username', None)
        player2_username = validated_data.pop('player2_username', None)
        # logger.info(f"Player1_username: {player1_username} and Player2_username: {player2_username}")
        if player1_username:
            player1_profile = self.get_user_profile_by_username(player1_username)

            validated_data['player1'] = player1_profile
        if player2_username:
            player2_profile = self.get_user_profile_by_username(player2_username)
            validated_data['player2'] = player2_profile

        validated_data['game_id'] = game_id
        validated_data['date'] = timezone.now()
        # logger.info(f"Validated data: {validated_data}")
        try:
            game = Game.objects.create(**validated_data)
        except: 
            raise serializers.ValidationError("Unable to create game")
        return game
    
    def update(self, instance, validated_data): # PUT
        player1_score = validated_data.get('player1_score')
        player2_score = validated_data.get('player2_score')
        current_user = validated_data.get('current_user')
        is_active = validated_data.get('is_active')
        # logger.info(f"SERIALIZERS.PY - Updating game {instance.game_id} with scores {player1_score} and {player2_score}, is_active: {is_active}")
        if player1_score is not None and player2_score is not None:
            instance.update_game(current_user=current_user, player1_score=player1_score, player2_score=player2_score, is_active=is_active)
            return instance
        raise serializers.ValidationError("Scores cannot be empty")

    def get_user_profile_by_username(self, username):
        try:
            user = User.objects.get(username=username)
            user_profile = UserProfile.objects.get(user=user)
            return user_profile
        except User.DoesNotExist:
            raise ValidationError(f"User with username '{username}' does not exist")
        except UserProfile.DoesNotExist:
            raise ValidationError(f"User profile for '{username}' does not exist")