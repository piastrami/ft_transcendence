from django.db import models
from authentication.models import User
from chat.models.ChatRoom import ChatRoom

class GameRequest(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, default=None)
    inviter = models.ForeignKey(User, related_name="sent_invitations", on_delete=models.CASCADE)
    recipient = models.ForeignKey(User, related_name="received_invitations", on_delete=models.CASCADE)
    status = models.CharField(max_length=15, choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('autorejected', 'Autoejected')], default='pending')
    game_type = models.CharField(max_length=10, choices=[('1v1', '1v1'), ('tournament', 'Tournament')], default='none')
    game_id = models.CharField(max_length=8, unique=True, editable=False, blank=True)  # Unique game ID
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('inviter', 'recipient', 'game_type', 'game_id')  # Prevent duplicate friend requests
        # ordering = ['-created_at']  # Orders by latest request first

    def __str__(self):
        return f"{self.inviter.username} invited {self.recipient.username} - {self.status}" 