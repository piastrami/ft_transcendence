from rest_framework import serializers
from profiles.models.BlockedUser import BlockedUser, BlockHistory

class BlockedUserSerializer(serializers.ModelSerializer):
    blocked_user = serializers.SerializerMethodField()

    def get_blocked_user(self, obj):
        return {"username": obj.blocked_user.username}

    class Meta:
        model = BlockedUser
        fields = ['id', 'blocked_user', 'is_active']

class BlockHistorySerializer(serializers.ModelSerializer):
    blocked_user = BlockedUserSerializer()

    class Meta:
        model = BlockHistory
        fields = ['blocked_user', 'action_type', 'timestamp']
