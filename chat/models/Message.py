from django.db import models
from django.utils.timezone import now

from authentication.models.User import User
from chat.models.ChatRoom import ChatRoom


class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    content = models.TextField()
    read = models.BooleanField(default=False)#, symmetrical=False)
    timestamp = models.DateTimeField(default=now)
    message_type = models.CharField(max_length=20, choices=[('message', 'message'), ('game_request', 'Game Request')], default='message')
    request_status = models.CharField(max_length=15, choices=[('for_sender', 'For_Sender'), ('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('autorejected', 'Autoejected')], default='none')
    game_type = models.CharField(max_length=10, choices=[('1v1', '1v1'), ('tournament', 'Tournament')], default='none')
    # game_type = models.CharField(max_length=10, choices=[('1v1', '1v1'), ('semifinal', 'Semifinal'), ('final', 'Final')], default='none')
    game_id = models.CharField(max_length=8, null=True, blank=True, default='none')

    def __str__(self):
        return f'{self.user.username}: {self.content[:50]}'

