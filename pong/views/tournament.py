from pong.models.tournament import Tournament, TournamentPlayer, TournamentGame, TournamentStatus
from pong.models.game import Game
from profiles.models.UserProfile import UserProfile
from pong.serializers.tournament import TournamentSerializer, TournamentPlayerSerializer, TournamentGameSerializer
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from utils.handleExceptionsFromServer import handle_exception
from notifications.models.GameRequestNotif import GameRequestNotif
import logging

# logger = logging.getLogger(__name__)

class BasicTournamentView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all tournaments"""
        tournaments = Tournament.objects.all().order_by('-created_at')
        serializer = TournamentSerializer(tournaments, many=True, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request):
        # logger.info("""Create a new tournament""")
        creator = request.user.userprofile
        # logger.info(f"Creating a new tournament by {creator}")
        serializer = TournamentSerializer(data=request.data)
        try:
            tournament_id = request.data.get('tournament_id', None)
            if serializer.is_valid(raise_exception=True):
                serializer.save(tournament_id=tournament_id, creator=creator)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            # logger.info(f"Failed to create tournament: {e}")
            return handle_exception(self, e)

class TournamentDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_id):
        # logger.info("""Get a specific tournament""")
        try:
            tournament = Tournament.objects.get(tournament_id=tournament_id)
            serializer = TournamentSerializer(tournament)
            # logger.info(f"Retrieved tournament {tournament_id} successfully. Its winner is {tournament.winner}.")
            return Response(serializer.data)
        
        except Tournament.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'This tournament was cancelled or does not exist',
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            # logger.error(f"Failed to get tournament {tournament_id}: {str(e)}")
            return handle_exception(self, e)

        
    def put(self, request, tournament_id):
        # logger.info("""Update a specific tournament""")
        try:
            tournament = Tournament.objects.get(tournament_id=tournament_id)
            
            if request.data.get('status') == TournamentStatus.COMPLETED:
                # logger.info(f"Completing tournament {tournament_id}")
                # if tournament.status != TournamentStatus.FINALS:
                #     return Response({
                #         'status': 'error',
                #         'message': 'Tournament is not in the final stage, cannot be completed.',
                #     }, status=status.HTTP_400_BAD_REQUEST)

                if tournament.complete_tournament():
                    return Response({
                        'status': 'success',
                        'message': 'Tournament completed successfully.',
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Final game has no winner yet.',
                    }, status=status.HTTP_200_OK)

            # If we need to create the final game, do it here
            if request.data.get('status') == TournamentStatus.FINALS:
                # logger.info(f"Creating final game for tournament {tournament_id}")
                # if tournament.status != TournamentStatus.SEMIFINALS:
                #     return Response({
                #         'status': 'error',
                #         'message': 'Tournament is not in semifinals yet, cannot create final game.',
                #     }, status=status.HTTP_400_BAD_REQUEST)

                final_game = tournament.create_final_game()

                if final_game:
                    return Response({
                        'status': 'success',
                        'message': 'Final game created successfully.',
                        'final_game': TournamentGameSerializer(final_game).data,
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Final game creation failed.',
                    }, status=status.HTTP_200_OK)

            serializer = TournamentSerializer(tournament, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid(raise_exception=True):
                serializer.save()
                return Response(serializer.data)

        except Exception as e:
            # logger.error(f"{str(e)}")
            return handle_exception(self, e)
        
    def delete(self, request, tournament_id):
        # logger.info(f"""Delete a specific tournament, requested by {request.user}""")
        try:
            tournament = Tournament.objects.get(tournament_id=tournament_id)
            for player in tournament.players.all():
                recipient = player.user_profile.user
                try: 
                    game_request = GameRequestNotif.objects.filter(

                        game_type='tournament',
                        game_id=tournament_id,
                    )
                    game_request.delete()
                        # logger.info(f"Game request notification deleted for {recipient} and tournament_id: {tournament_id}.")

                except GameRequestNotif.DoesNotExist:
                    pass
                    # logger.info(f"No game request notification to delete for {recipient}.")
            tournament.delete()
            return Response({
                'status': 'success',
                'message': 'Tournament deleted successfully',
            })
    
        except Exception as e:
            # logger.error(f"{str(e)}")
            return handle_exception(self, e)
        
class UpdateTournamentStatusView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_id):
        """Update the status of the tournament"""
        try:
            tournament = Tournament.objects.get(tournament_id=tournament_id)
            if tournament.status != TournamentStatus.SEMIFINALS:
                return Response({
                    'status': 'error',
                    'message': 'Tournament is not in semifinals, cannot create finals.',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Assuming you want to directly trigger the final game creation
            final_game = tournament.create_final_game()

            if final_game:
                return Response({
                    'status': 'success',
                    'message': 'Final game created successfully.',
                    'final_game': TournamentGameSerializer(final_game).data,
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'status': 'error',
                    'message': 'Final game creation failed.',
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            # logger.error(f"Error updating tournament {tournament_id}: {str(e)}")
            return handle_exception(self, e)

class TournamentPlayerView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, tournament_id):
        """Get all players in a tournament"""
        try:
            tournament = Tournament.objects.get(tournament_id=tournament_id)
            # logger.info(f"\033[91mGetting players for tournament {tournament_id}\033[0m")
            players = TournamentPlayer.objects.filter(tournament=tournament)
            # logger.info(f"\033[91mPlayers are {players}\033[0m")
            serializer = TournamentPlayerSerializer(players, many=True)
            return Response(serializer.data)
        except Exception as e:
            # logger.error(f"{str(e)}")
            return handle_exception(self, e)

    
    def post(self, request, tournament_id):
        """Join a tournament"""
        try:
            # logger.info(f"User {request.user} is joining tournament {tournament_id}")
            tournament = Tournament.objects.get(tournament_id=tournament_id)
            player_profile = request.user.userprofile
            # logger.info(f"Player {player_profile} joining tournament {tournament}")
            if tournament.status != TournamentStatus.WAITING:
                return Response({
                    'status': 'error',
                    'message': 'You cannot join a tournament that has started',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if TournamentPlayer.objects.filter(tournament=tournament, user_profile=player_profile).exists():
                return Response({
                    'status': 'error',
                    'message': 'You have already joined this tournament',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if tournament.players.count() >= tournament.max_players:
                return Response({
                    'status': 'error',
                    'message': 'This tournament is full',
                }, status=status.HTTP_400_BAD_REQUEST)

            alias = request.data.get('alias', player_profile.user.username)
            player= TournamentPlayer.objects.create(
                tournament=tournament, user_profile=player_profile,
                alias=alias,
            )
            try: 
                GameRequestNotif.objects.filter(
                    recipient=request.user,
                    game_type='tournament',
                    game_id=tournament_id,
                ).delete()
            except GameRequestNotif.DoesNotExist:
                pass
                # logger.info("No game request notification to delete.")

            tournament_started = False
            if tournament.players.count() == tournament.max_players:
                tournament.is_active = True
                tournament_started = tournament.start_tournament()
            
            serializer = TournamentPlayerSerializer(player, context={'request': request})
            return Response({
                'player': serializer.data,
                'tournament_started': tournament_started,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # logger.error(f"{str(e)}")
            return handle_exception(self, e)

    
    def delete(self, request, tournament_id):
        """Leave a tournament"""
        try:
            tournament = Tournament.objects.get(tournament_id=tournament_id)
            player_profile = request.user.userprofile
            player = TournamentPlayer.objects.get(tournament=tournament, player=player_profile)
            player.delete()
            tournament.status = TournamentStatus.INTERRUPTED
            tournament.save()
            return Response({
                'status': 'success',
                'message': 'You have left the tournament',
            })

        except Exception as e:
            # logger.error(f"{str(e)}")
            return handle_exception(self, e)
            
class TournamentGameFromGameIDView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, game_id):
        """Get tournament from game ID"""
        try:
            try:
                game = Game.objects.get(game_id=game_id)
            except Game.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'Game not found',
                }, status=status.HTTP_404_NOT_FOUND)
                
            if game.mode != "Tournament":
                return Response({
                    'status': 'error',
                    'message': 'This game is not part of a tournament',
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Find the tournament game associated with this game
            try:
                tournament_game = TournamentGame.objects.get(game=game)
            except TournamentGame.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'No tournament game associated with this game',
                }, status=status.HTTP_404_NOT_FOUND)
                
            # Get the tournament
            tournament = tournament_game.tournament
            
            # Serialize and return the tournament data
            serializer = TournamentSerializer(tournament)
            return Response({
                'status': 'success',
                'tournament': serializer.data,
                'tournament_game': TournamentGameSerializer(tournament_game).data
            })
            
        except Exception as e:
            # logger.error(f"Error retrieving tournament for game {game_id}: {str(e)}")
            return handle_exception(self, e)