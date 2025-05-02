from rest_framework import serializers

from notifications.models.FriendRequest import FriendRequest

class FriendRequestSerializer(serializers.ModelSerializer):
    sender = serializers.CharField(source="sender.username", read_only=True)
    receiver = serializers.CharField(source="receiver.username", read_only=True)

    class Meta:
        model = FriendRequest
        fields = ["id", "sender", "receiver", "timestamp", "accepted", "message"]
