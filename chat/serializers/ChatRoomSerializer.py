from rest_framework import serializers
from django.core.exceptions import ValidationError
from authentication.models.User import User
from chat.models.ChatRoom import ChatRoom

class ChatRoomSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['name', 'created_at', 'participants']


    def validate_participants(self, value):
        """Ensure there are exactly two participants in the chat room."""
        if len(value) != 2:
            raise ValidationError("Private chatrooms can only have two participants.")
        return value

    def get_participants(self, obj):
        """Return a list of usernames instead of User objects."""
        return [user.username for user in obj.participants.all()]
    
    def create(self, validated_data):
        participants_data = validated_data.pop('participants')
        # Create the ChatRoom instance
        chatroom = ChatRoom.objects.create(**validated_data)
        
        # Add participants to the chatroom
        for participant_data in participants_data:
            try:
                participant = User.objects.get(username=participant_data['username'])
                chatroom.participants.add(participant)
            except User.DoesNotExist:
                raise ValidationError(f"User {participant_data['username']} does not exist.")
        
        return chatroom
