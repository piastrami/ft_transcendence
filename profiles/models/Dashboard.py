from django.db import models
from profiles.models import UserProfile
from django.utils import timezone

class Dashboard(models.Model):
    # chaque dashboard est lié à un seul UserProfile
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE)

    # Stats générales
    games_played = models.IntegerField(default=0)
    games_won = models.IntegerField(default=0)
    total_points_scored = models.IntegerField(default=0)
    
    # Stats avancées
    longest_winning_streak = models.IntegerField(default=0)
    current_winning_streak = models.IntegerField(default=0)
    average_score_per_game = models.FloatField(default=0.0)
    
    # Classement
    rank_points = models.IntegerField(default=0)
    current_rank = models.IntegerField(default=0)  # position dans le classement
    
    # Achievements/Trophées
    perfect_games = models.IntegerField(default=0)  # Parties gagnées 10-0
    comeback_wins = models.IntegerField(default=0)  # Victoires après avoir été mené
    
    # Timestamps
    last_game_played = models.DateTimeField(null=True, blank=True)
    account_created = models.DateTimeField(auto_now_add=True)

    # don't know if this is necessary
    # def get_all_games(self):
    # return Game.objects.filter(
    #     Q(player1=self.user_profile.user) | Q(player2=self.user_profile.user)
    # )

    def update_stats(self, game):
        """Met à jour les stats après une partie"""
        self.games_played += 1
        if game.winner == self.user:
            self.games_won += 1
            self.current_winning_streak += 1
            if self.current_winning_streak > self.longest_winning_streak:
                self.longest_winning_streak = self.current_winning_streak
        else:
            self.current_winning_streak = 0

        # Met à jour les points marqués
        if game.player1 == self.user:
            self.total_points_scored += game.player1_score
        else:
            self.total_points_scored += game.player2_score

        self.average_score_per_game = self.total_points_scored / self.games_played
        self.last_game_played = timezone.now()
        self.save()

    def calculate_rank_points(self):
        """Calcule les points de classement"""
        win_rate = (self.games_won / self.games_played) if self.games_played > 0 else 0
        self.rank_points = (win_rate * 1000) + (self.total_points_scored * 0.1)
        self.save()

    def __str__(self):
        return f"Dashboard de {self.user.username}"