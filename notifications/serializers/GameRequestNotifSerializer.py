from rest_framework import serializers
from notifications.models.GameRequestNotif import GameRequestNotif

class GameRequestNotifSerializer(serializers.ModelSerializer):
    inviter_username = serializers.ReadOnlyField(source="inviter.username")
    recipient_username = serializers.ReadOnlyField(source="recipient.username")

    class Meta:
        model = GameRequestNotif
        fields = ['id', "message", 'inviter', 'inviter_username', 'recipient', 'recipient_username', 'status', "game_type", 'game_id', 'created_at']
        read_only_fields = ['id', 'game_id','inviter', 'inviter_username', "game_type", 'created_at']
        # fields = '__all__'