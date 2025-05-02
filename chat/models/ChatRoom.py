from django.db import models
from authentication.models.User import User

class ChatRoom(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    participants = models.ManyToManyField(User, related_name='chatrooms')  # Allow multiple participants
    
    def __str__(self):
        # Concatenate the usernames of all participants for this chatroom
        participant_names = ", ".join([user.username for user in self.participants.all()])
        return f"ChatRoom: {self.name} ({participant_names})"
        
    def add_participants(self, users):
        if len(users) == 2:  # Only allow two participants for private chat
            self.participants.set(users)
            self.save()
        else:
            raise ValueError("Only two participants are allowed in a private chat.")

