from rest_framework import serializers
from pong.models.game import Game
from profiles.serializers.UserProfileSerializer import UserProfileSerializer
from profiles.models import UserProfile

class GamePlayerUpdateSerializer(serializers.Serializer):
    player1_id = serializers.IntegerField(required=False, allow_null=True)
    player2_id = serializers.IntegerField(required=False, allow_null=True)
    
    def update(self, instance, validated_data):
        player1_id = validated_data.get('player1_id')
        player2_id = validated_data.get('player2_id')
        
        if player1_id:
            try:
                player1_profile = UserProfile.objects.get(id=player1_id)
                instance.player1 = player1_profile
            except UserProfile.DoesNotExist:
                raise serializers.ValidationError({"player1_id": "Ce profil utilisateur n'existe pas"})
        
        if player2_id:
            try:
                player2_profile = UserProfile.objects.get(id=player2_id)
                instance.player2 = player2_profile
            except UserProfile.DoesNotExist:
                raise serializers.ValidationError({"player2_id": "Ce profil utilisateur n'existe pas"})
        
        instance.save()
        return instance
