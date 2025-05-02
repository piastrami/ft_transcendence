from rest_framework import serializers
from authentication.models import User  # Import your custom User model
from profiles.models.FriendShip import Friendship

class FriendshipSerializer(serializers.ModelSerializer):
    user1 = serializers.CharField(source="user1.username", read_only=True)
    user2 = serializers.CharField(source="user2.username", read_only=True)

    class Meta:
        model = Friendship
        fields = ["id", "user1", "user2", "created_at"]
