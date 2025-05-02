from rest_framework import serializers
from chat.models.Message import Message

# TO DEBUG ##############################
import logging
logger = logging.getLogger(__name__)
########################################


class MessageSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    read = serializers.BooleanField(required=False)  # Ensure read is handled correctly

    class Meta:
        model = Message
        fields = ['id', 'room', 'user', 'username', 'content', 'read', 'timestamp', 'message_type', 'request_status', 'game_type', 'game_id']


    def get_username(self, obj):
        logger.info(f"User in get_username: {obj.user}")  # Debugging
        if obj.user:
            return obj.user.username
        return "Unknown User"

    def create(self, validated_data):
        room = validated_data.pop('room')
        read_status = validated_data.pop('read')  # Ensure read is explicitly extracted

        # Create the message object with read value
        message = Message.objects.create(room=room, read=read_status, **validated_data)

        return message