from django.db import models
from authentication.models.User import User  # Updated import
from profiles.models.FriendShip import Friendship
import logging
logger = logging.getLogger(__name__)

class FriendRequest(models.Model):
    sender = models.ForeignKey(User, related_name="sent_requests", on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name="received_requests", on_delete=models.CASCADE)
    message = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(default=False)

    def __str__(self):
        return f"Friend Request from {self.sender} to {self.receiver}"
    
    def accept(self):
        # logger.info("""Accept the friend request and create a friendship""")
        Friendship.objects.create(user=self.sender, friend=self.receiver)
        self.delete()
