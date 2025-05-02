from django.db import models
from authentication.models.User import User  # Ensure correct import
from django.utils import timezone

class BlockedUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_users')
    blocked_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    is_active = models.BooleanField(default=True)  # True = Blocked, False = Unblocked
    
    class Meta:
        unique_together = ['user', 'blocked_user']  # Ensures one block action per user-blocked_user pair

    def __str__(self):
         return f"{self.user.username} blocked {self.blocked_user.username} (Active: {self.is_active})"


class BlockHistory(models.Model):
    blocked_user = models.ForeignKey(BlockedUser, on_delete=models.CASCADE, related_name='block_history')
    action_type = models.CharField(max_length=10, choices=[('block', 'Block'), ('unblock', 'Unblock')])
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.blocked_user.user.username} {self.action_type} {self.blocked_user.blocked_user.username} at {self.timestamp}"

    @classmethod
    def create_block_history(cls, blocked_user, action_type):
        """Helper function to create a block or unblock history."""
        return cls.objects.create(blocked_user=blocked_user, action_type=action_type)
