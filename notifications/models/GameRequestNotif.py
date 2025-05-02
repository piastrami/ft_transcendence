from django.db import models
from authentication.models import User


class GameRequestNotif(models.Model):
    inviter = models.ForeignKey(User, related_name="notif_sent_invitations", on_delete=models.CASCADE)
    recipient = models.ForeignKey(User, related_name="notif_received_invitations", on_delete=models.CASCADE)
    status = models.CharField(max_length=15, choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('autorejected', 'Autoejected')], default='pending')
    game_type = models.CharField(max_length=10, choices=[('pong', 'Pong'), ('tournament', 'Tournament')], default='none')
    game_id = models.CharField(max_length=8, unique=False, editable=False, blank=True)  # Unique game ID
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.inviter.username} invited {self.recipient.username} - {self.status}" 