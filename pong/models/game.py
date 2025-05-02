from django.db import models
from profiles.models.UserProfile import UserProfile
from authentication.models.User import User
import uuid
from django.utils import timezone
import logging

# logger = logging.getLogger(__name__)

class Game(models.Model):
    game_id = models.CharField(primary_key=True, max_length=50, unique=True, default="game-0")
    mode = models.CharField(max_length=100, default="1vs1") # 1vs1 ou Tournament
    player1 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="player1", null=True, blank=True)
    player2 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="player2", null=True, blank=True)
    winner = models.ForeignKey(UserProfile, on_delete=models.CASCADE, null=True, blank=True)
    player1_score = models.IntegerField(default=0)
    player2_score = models.IntegerField(default=0)
    is_active = models.BooleanField(default=False)
    date = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"MODELS.PY: Game {self.game_id}: {self.player1} vs {self.player2 if self.player1 and self.player2 else 'Waiting...'}"

    def update_game(self, current_user, player1_score, player2_score, is_active):
        if (player1_score is None or player2_score is None):
            raise ValueError("Scores cannot be empty")
        self.player1_score = player1_score
        self.player2_score = player2_score
        if player1_score == player2_score == 0:
            try:
                user = User.objects.get(username=current_user)
                requestUser = UserProfile.objects.get(user=user)
                self.winner = requestUser
            except UserProfile.DoesNotExist or User.DoesNotExist:
                self.winner = player1
        elif player1_score > player2_score:
            self.winner = self.player1
        elif player2_score > player1_score:
            self.winner = self.player2
        self.is_active = is_active
        self.save()
        return self
        
    def add_player1(self, player1):
        try:
            player1_profile = UserProfile.objects.get(user=player1)
        except UserProfile.DoesNotExist:
            raise ValueError("Player1 does not exist")
        self.player1 = player1_profile
        self.save()
        return self
    
    def add_player2(self, player2):
        try:
            player2_profile = UserProfile.objects.get(user=player2)
        except UserProfile.DoesNotExist:
            raise ValueError("Player2 does not exist")
        self.player2 = player2_profile
        self.save()
        return self

    def set_game_active(self):
        self.is_active = True
        self.save()
        return self