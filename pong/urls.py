# serve the game page, url for the game view

from django.urls import path
from .views.views_cli import GamePlayersUpdateView, ActiveGamesView, UpdateGameStatusView
from .views.game import GetIpView, NewGame, GameUpdate, genUniqueIDView
from pong.views.tournament import BasicTournamentView, TournamentDetailView, TournamentPlayerView, UpdateTournamentStatusView, TournamentGameFromGameIDView

urlpatterns = [
    
    path('get_ip/', GetIpView.as_view(), name='get_ip'),
    path('generate_id/', genUniqueIDView.as_view(), name='generate_id'),
    path('game_session/<str:game_id>/', NewGame.as_view(), name='new_game'),
    path('game_session/update/<str:game_id>/', GameUpdate.as_view(), name='game_update'),
    path('game/get_tournament/<str:game_id>/', TournamentGameFromGameIDView.as_view(), name='get_tournament_from_game_id'),
    
    # cli_pong
    path('game/update/players/<str:game_id>/', GamePlayersUpdateView.as_view(), name='game_update_players'),
    path('games/active/', ActiveGamesView.as_view(), name='game_active'),
    path('game/update/status/<str:game_id>/', UpdateGameStatusView.as_view(), name='game_update_status'),

    # Tournaments
    path('tournament/new/', BasicTournamentView.as_view(), name='create_tournament'),
    path('tournament/all/', BasicTournamentView.as_view(), name='all_tournaments'),
    path('tournament/info/<str:tournament_id>/', TournamentDetailView.as_view(), name='tournament_detail'),
    path('tournament/update/<str:tournament_id>/', TournamentDetailView.as_view(), name='update_tournament'),
    path('tournament/remove/<str:tournament_id>/', TournamentDetailView.as_view(), name='remove_tournament'),
    path('tournament/leave/<str:tournament_id>/', TournamentPlayerView.as_view(), name='leave_tournament'),
    path('tournament/timeout/<str:tournament_id>/', TournamentDetailView.as_view(), name='timeout_tournament'),

    # Tournament players
    path('tournament/players/all/<str:tournament_id>/', TournamentPlayerView.as_view(), name='view_players'),
    path('tournament/join/<str:tournament_id>/', TournamentPlayerView.as_view(), name='add_player'),
]
