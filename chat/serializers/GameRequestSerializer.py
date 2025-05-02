from rest_framework import serializers
from chat.models.GameRequest import GameRequest
# from authentication.models.User import User

class GameRequestSerializer(serializers.ModelSerializer):
    inviter_username = serializers.ReadOnlyField(source="inviter.username")
    recipient_username = serializers.ReadOnlyField(source="recipient.username")
    room_name = serializers.ReadOnlyField(source="room.name")

    class Meta:
        model = GameRequest
        fields = ['id', 'inviter', 'inviter_username', 'recipient', 'recipient_username', 'room', 'room_name', 'status', "game_type", 'game_id', 'created_at']
        read_only_fields = ['id', 'game_id','inviter', 'inviter_username', 'room_name', "game_type", 'created_at']
        # fields = '__all__'