import json
from django.conf import settings
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from profiles.models.FriendShip import Friendship 
from notifications.models.GameRequestNotif import GameRequestNotif

from chat.models.Message import Message
from channels.db import database_sync_to_async

import redis

# Setup Redis connection
redis_client = redis.StrictRedis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

import logging
logger = logging.getLogger("channels")
logger = logging.getLogger("daphne")
# logger = logging.getLogger(__name__)


@receiver(post_save, sender=Friendship)
def friendship_created(sender, instance, created, **kwargs):
    # logger.info("""Send WebSocket notification when a friendship is created.""")
    if created:
        channel_layer = get_channel_layer()
        # logger.info(f"Friendship created: {instance.user1.username} and {instance.user2.username}")
        user1_group = f"notifications_{instance.user1.username}"
        user2_group = f"notifications_{instance.user2.username}"

        # Notify user1 that user2 accepted their friend request
        async_to_sync(channel_layer.group_send)(
            user1_group,
            {
                "type": "send_response",
                "message": f" you are friends with {instance.user2.username}!",
                "sender": instance.user2.username,
            },
        )

@receiver(post_delete, sender=Friendship)
def friendship_deleted(sender, instance, **kwargs):
    # logger.info("""Send WebSocket notification when a friendship is deleted.""")
    channel_layer = get_channel_layer()
    user1_group = f"notifications_{instance.user1.username}"
    user2_group = f"notifications_{instance.user2.username}"

    # Notify both users that the friendship has been removed
    async_to_sync(channel_layer.group_send)(
        user1_group,
        {
            "type": "send_response",
            "message": f"You are no longer friends with {instance.user2.username}.",
            "sender": instance.user2.username,
        },
    )

@receiver(post_save, sender=GameRequestNotif)
def gamenotification_created(sender, instance, created, **kwargs):
    # logger.info("""Send WebSocket notification when a game notif is created.""")
    if created:
        channel_layer = get_channel_layer()
        # logger.info(f"game notif created: {instance.inviter.username} and {instance.recipient.username}")
        user1_group = f"notifications_{instance.inviter.username}"
        user2_group = f"notifications_{instance.recipient.username}"

        # Notify user1 that user2 accepted their friend request
        async_to_sync(channel_layer.group_send)(
            user2_group,
            {
                "type": "gameNotif",
                "sender": instance.inviter.username,
            },
        )


@receiver(post_delete, sender=GameRequestNotif)
def gameNotif_deleted(sender, instance, **kwargs):
    # logger.info("""Send WebSocket notification when a gamenotification is deleted.""")
    channel_layer = get_channel_layer()
    user1_group = f"notifications_{instance.inviter.username}"
    user2_group = f"notifications_{instance.recipient.username}"

    # Notify both users that the friendship has been removed
    async_to_sync(channel_layer.group_send)(
        user2_group,
        {
            "type": "gameNotif",
            "sender": instance.inviter.username,
        },
    )


@receiver(pre_save, sender=GameRequestNotif)
def status_changed_for_game_id(sender, instance, **kwargs):
    channel_layer = get_channel_layer()
    user1_group = f"notifications_{instance.inviter.username}"
    user2_group = f"notifications_{instance.recipient.username}"

    if not instance.pk:
        # It's a new object, so skip
        return

    # Get the current record from the DB using game_id
    try:
        old_instance = GameRequestNotif.objects.get(pk=instance.pk)
    except GameRequestNotif.DoesNotExist:
        return

    if old_instance.game_id != instance.game_id:
        # If game_id is changing, that's a different case
        return

    if old_instance.status != instance.status:
        # logger.info(f"[GAME {instance.game_id}] Status changed from {old_instance.status} ➝ {instance.status}")
        # Notify both users that the friendship has been removed
        async_to_sync(channel_layer.group_send)(
            user2_group,
            {
                "type": "gameNotif",
                "sender": instance.inviter.username,
            },
        )



@receiver(post_save, sender=Message)
def notify_unread_message(sender, instance, created, **kwargs):
    # logger.info(f"\033[91mnotify_unread_message() in signal\033[0m")
    room_name = instance.room.name  # Assuming ChatRoom has a `name` field
    sender_username = instance.user.username if instance.user else "Anonymous"

    # Extract users from room_name (assuming "user1_user2" format)
    users = room_name.split('_')

    if len(users) != 2:
        return  # Invalid room name format

    recipient_username = users[1] if users[0] == sender_username else users[0]

    # logger.info(f"\033[91Check if the recipient has an active WebSocket connection\033[0m")
    redis_key = f"active_in_room:{room_name}"
    # logger.info("redis_key for room(%s) in signal: %s", room_name, redis_key)
    
    # Check if any connections exist for this room
    active_uesrs = redis_client.smembers(redis_key)
    # logger.info("active_users for room(%s) in signal: %s", room_name, active_uesrs)
    if created:

        # if not active_channels:
        if recipient_username not in active_uesrs:  # If recipient is offline
            # logger.info(f"recipient_username in signal: {recipient_username}")

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"notifications_{recipient_username}",  # Send to recipient-specific group
                {
                    "type": "unread_message",
                    "friend_name": instance.user.username,
                }
            )