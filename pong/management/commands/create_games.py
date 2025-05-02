from django.core.management.base import BaseCommand
from django.utils import timezone
from authentication.models.User import User
import sys
import os
import random
from datetime import timedelta
from profiles.models.UserProfile import UserProfile
from pong.models.game import Game
from django.db.models import Q

class Command(BaseCommand):
    help = 'Crée 20 jeux pour chaque utilisateur avec des stats aléatoires et un mode aléatoire pour Buse, Felise, Pia et Romina, sauf si des jeux existent déjà'

    def handle(self, *args, **kwargs):
        user_names = ['buse', 'felise', 'pia', 'romina']
        modes = ["1vs1", "Tournament"]
        
        user_profiles = {}
        for username in user_names:
            user = User.objects.filter(username=username).first()
            if user:
                profile, created = UserProfile.objects.get_or_create(user=user)
                user_profiles[username] = profile
                if created:
                    self.stdout.write(self.style.SUCCESS(f"UserProfile créé pour {username}"))
                else:
                    self.stdout.write(self.style.SUCCESS(f"UserProfile existant trouvé pour {username}"))

        if len(user_profiles) < 2:
            self.stdout.write(self.style.ERROR("Pas assez d'utilisateurs pour créer des jeux."))
            return

        games_created = 0
        user_list = list(user_profiles.values())
        
        for player1 in user_list:
            existing_games = Game.objects.filter(Q(player1=player1) | Q(player2=player1)).count()
            if existing_games >= 20:
                self.stdout.write(self.style.WARNING(
                    f"{player1.user.username} a déjà {existing_games} jeux enregistrés. Aucun nouveau jeu créé."
                ))
                continue

            for _ in range(20 - existing_games):
                player2 = random.choice([u for u in user_list if u != player1])
                game_id = f"game-{player1.id}-{player2.id}-{timezone.now().timestamp()}"

                winner = random.choice([player1, player2])
                if winner == player1:
                    player1_score = 5
                    player2_score = random.randint(0, 4)
                else:
                    player1_score = random.randint(0, 4)
                    player2_score = 5
            
                mode = random.choice(modes)

                # generating a date
                days_ago = random.randint(1, 30)
                hours_ago = random.randint(0, 23)
                date = timezone.now() - timedelta(days=days_ago, hours=hours_ago)

                game = Game.objects.create(
                    game_id=game_id,
                    mode=mode,
                    player1=player1,
                    player2=player2,
                    player1_score=player1_score,
                    player2_score=player2_score,
                    winner=winner,
                    is_active=False,
                    date=date 
                )
                games_created += 1
                self.stdout.write(self.style.SUCCESS(f"Jeu créé : {game} (Mode: {mode}, Date: {date})"))

        self.stdout.write(self.style.SUCCESS(f"{games_created} jeux créés avec succès."))
