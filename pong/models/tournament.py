from django.db import models
from django.utils import timezone
from profiles.models.UserProfile import UserProfile
from pong.models.game import Game
import uuid
from channels.layers import get_channel_layer
from authentication.models.User import User
import json
from chat.models.Message import Message
from chat.models.ChatRoom import ChatRoom
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from datetime import datetime


# import logging 
# logger = logging.getLogger("channels")
# logger = logging.getLogger(__name__)

class TournamentStatus(models.TextChoices):
    WAITING = 'waiting', 'Waiting for players'
    SEMIFINALS = 'semifinals', 'Semifinals in progress'
    FINALS = 'finals', 'Finals in progress'
    COMPLETED = 'completed', 'Tournament completed'
    INTERRUPTED = 'interrupted', 'Tournament interrupted'

class Tournament(models.Model):
    tournament_id = models.CharField(primary_key=True, max_length=100, unique=True, default="tournament-0")
    creator = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="created_tournaments")
    winner = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="won_tournaments")
    max_players = models.IntegerField(default=4)
    status = models.CharField(
        max_length=20,
        choices=TournamentStatus.choices,
        default=TournamentStatus.WAITING
    )
    is_active = models.BooleanField(default=False)
    date_created = models.DateTimeField(default=timezone.now)
    date_completed = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Tournament {self.tournament_id} - Status: {self.get_status_display()}"

    def start_tournament(self):
        # logger.info("""Start the tournament if enough players have joined""")
        if self.players.count() == self.max_players:  # This works because of the related_name="players"
            self.status = TournamentStatus.SEMIFINALS
            self.is_active = True
            self.save()
            # Create semifinal games
            self._create_semifinal_games()

            self.create_chatrooms() 
            # SEND MESSAGE ABOUT SEMIFINALS TO PLAYERS
            return True
        return False

    def _create_semifinal_games(self):
        # logger.info("""Create the semifinal games""")
        tournament_players = list(self.players.all())  # Get TournamentPlayer objects
        
        # Create first semifinal: players[0] vs players[1]
        game1 = Game.objects.create(
            game_id=f"{str(uuid.uuid4())[:8]}",
            mode="Tournament",
            player1=tournament_players[0].user_profile,
            player2=tournament_players[1].user_profile
        )
        
        # Create second semifinal: players[2] vs players[3]
        game2 = Game.objects.create(
            game_id=f"{str(uuid.uuid4())[:8]}",
            mode="Tournament",
            player1=tournament_players[2].user_profile,
            player2=tournament_players[3].user_profile
        )
        
        # Create tournament games
        TournamentGame.objects.create(
            tournament=self,
            game=game1,
            round="semifinal",
            order=1,
            alias1=tournament_players[0].alias,
            alias2=tournament_players[1].alias,
        )
        # logger.info("ℹ️send msg to info room for each player")
        self.send_tournament_info(tournament_players[0].user_profile,tournament_players[1].user_profile, 'semifinal')
        
        TournamentGame.objects.create(
            tournament=self,
            game=game2,
            round="semifinal",
            order=2,
            alias1=tournament_players[2].alias,
            alias2=tournament_players[3].alias,
        )
        # logger.info("ℹ️send msg to info room for each player")
        self.send_tournament_info(tournament_players[2].user_profile,tournament_players[3].user_profile, 'semifinal')
        

    def create_final_game(self):
        # logger.info("""Create the final game once semifinals are complete""")
        # Get winners from semifinals
        semifinal_games = self.tournament_games.filter(round="semifinal")
        if semifinal_games.count() == 2 and all(game.game.winner for game in semifinal_games):
            winner1 = semifinal_games.get(order=1).game.winner
            winner2 = semifinal_games.get(order=2).game.winner
            # logger.info(f"Winner 1: {winner1}, Winner 2: {winner2}")
            # Create final game
            final_game = Game.objects.create(
                game_id=f"{str(uuid.uuid4())[:8]}",
                mode="Tournament",
                player1=winner1,
                player2=winner2
            )
            
            alias1 = self.players.get(user_profile=winner1).alias
            alias2 = self.players.get(user_profile=winner2).alias
            # Create tournament game entry
            final_tournament_game = TournamentGame.objects.create(
                tournament=self,
                game=final_game,
                round="final",
                order=1,
                alias1=alias1,
                alias2=alias2,
            )
            
            # logger.info("ℹ️send msg to info room for each player")
            self.send_tournament_info(winner1, winner2, 'final')

            # Update tournament status
            self.status = TournamentStatus.FINALS
            self.save()
            return final_tournament_game
        return None


################################ SENDING MESSAGES TO INFO ####################################
    def create_chatrooms(self):
        try:
            # logger.info("Creating chatrooms between each player and 'info'")

            info_user = User.objects.filter(username="info").first()
            if not info_user:
                # logger.error("User 'info' does not exist!")
                return

            for each_game in self.tournament_games.all():
                player1 = each_game.game.player1.user
                player2 = each_game.game.player2.user

                for player in [player1, player2]:
                    if player.username != "info":
                        sorted_usernames = sorted([player.username, "info"])
                        room_name = f"{sorted_usernames[0]}_{sorted_usernames[1]}"

                        chat_room, created = ChatRoom.objects.get_or_create(name=room_name)

                        # if created:
                        #     logger.info(f"✅ Created chatroom '{room_name}'")
                        # else:
                        #     logger.info(f"⚠️ Chatroom '{room_name}' already exists")

                        # ✅ Always ensure participants are added
                        current_participants = set(chat_room.participants.all())
                        expected_participants = {player, info_user}

                        if current_participants != expected_participants:
                            # logger.info(f"🔁 Updating participants for room '{room_name}'")
                            chat_room.add_participants([player, info_user])
                        # else:
                            # logger.info(f"✅ Room '{room_name}' already has correct participants")

        except Exception as e:
            pass
            # logger.error(f"❌ Error creating chatrooms: {e}")

    

    
    def send_tournament_info(self, player1, player2, game_round = None):

        try:
            channel_layer = get_channel_layer()

            for user in [player1, player2]:
                sorted_usernames = sorted([user.user.username, "info"])  # Ensure sorted order for consistency
                room_name = f"{sorted_usernames[0]}_{sorted_usernames[1]}"
                group_name = f"chat_{room_name}"  # The group the ChatConsumer is listening to
                
                # Determine the other player’s name (the one who isn't "info")
                other_user = player1 if user != player1 else player2
                other_alias = self.players.get(user_profile=other_user).alias
                message= f"🏆 You will play a {game_round} match against {other_alias} in a tournament.🏆"
                # 
                # Head to the tournament {self.tournament_id} page to play a {game_round} match against {other_user.user.username}
                # Your tournament {game_round} match has been scheduled! You will be playing against {other_user.user.username}.
                info = {
                    "type": "chat_message",  # This triggers the chat_message method inside ChatConsumer
                    "message": message,
                    "username": "info",  # The message sender
                    "timestamp": str(datetime.now()),  # Timestamp for the message
                    "request_status": "none",  # Optional: Add any custom request status
                    "game_type": "tournament",  # You can set the game type for this message
                    "game_id": str(self.tournament_id),  # Optional: Add gameId or other data if required
                    # Optional: Add gameId or other data if required
                }
                # Fetch or create the chat room
                chat_room, created = ChatRoom.objects.get_or_create(name=room_name)


                # Send message to the chat group (this will reach ChatConsumer)
                async_to_sync(channel_layer.group_send)(group_name, info)
                info_user = User.objects.get(username="info")

                info_message = Message(
                    room=chat_room,
                    user=info_user,
                    content=message,
                    game_type="tournament",
                    game_id=self.tournament_id, 
                )
                # Saving the message asynchronously using database_sync_to_async
                # database_sync_to_async(info_message.save)()
                info_message.save()

        except Exception as e:
            pass
        #     logger.error(f"❌ Error sending tournament info message: {e}")


#########################################################################################################################################

    def complete_tournament(self): 
        """Complete the tournament"""
        final_game = self.tournament_games.get(round="final")
        if final_game.game.winner:
            self.status = TournamentStatus.COMPLETED
            self.is_active = False
            self.winner = final_game.game.winner
            self.date_completed = timezone.now()
            self.save()
            # logger.info(f"Tournament {self.tournament_id} completed. Winner: {self.winner}")
            return True
        return False

    # def announce_games_in_chat:
    #     chat_socket = new ChatConsumer()

class TournamentPlayer(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="players")
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="tournaments")
    alias = models.CharField(max_length=100, blank=True)
    joined_at = models.DateTimeField(default=timezone.now)
    # notif_received = models.ForeignKey(GameRequestNotif, on_delete=models.CASCADE, null=True, blank=True, related_name="tournament_player_notif")
    
    class Meta:
        unique_together = ('tournament', 'user_profile')
    
    def __str__(self):
        return f"{self.user_profile} in {self.tournament}"

class TournamentGame(models.Model):
    ROUND_CHOICES = [
        ('semifinal', 'Semifinal'),
        ('final', 'Final'),
    ]
    
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="tournament_games")
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="tournament_game")
    alias1 = models.CharField(max_length=100, blank=True, default="")
    alias2 = models.CharField(max_length=100, blank=True, default="")
    round = models.CharField(max_length=20, choices=ROUND_CHOICES)
    order = models.IntegerField()  # Order within the round (e.g., semifinal 1, semifinal 2)
    
    class Meta:
        unique_together = ('tournament', 'game')
        ordering = ['round', 'order']
    
    def __str__(self):
        return f"{self.get_round_display()} {self.order} in {self.tournament}"