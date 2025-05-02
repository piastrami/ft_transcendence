from rest_framework import serializers
from profiles.models.UserProfile import UserProfile

class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['avatar']