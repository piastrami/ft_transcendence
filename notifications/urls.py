from django.urls import path
from notifications.views.FriendRequestView import FriendRequestView
from notifications.views.GameRequestNotifView import GameRequestNotifAPIView, GameRequestNotifListAPIView
from notifications.views.GameRequestNotifView import CreateGameRequestNotifAPIView

urlpatterns = [
    #FriendRequest
    path("friend-request/", FriendRequestView.as_view(), name="friend-request"),
    path("friend-request/reject/", FriendRequestView.as_view(), name="friend-request-reject"),

    #GameRequest
    path("game-request-notif/", GameRequestNotifAPIView.as_view(), name="specific-game-request-notif"),
    path("game-request-notif/create/", CreateGameRequestNotifAPIView.as_view(), name="create-game-request-notif"),
    
    path("game-request-notif/list/", GameRequestNotifListAPIView.as_view(), name="game-request-list-notif"),
    path("game-request-notif/response/", GameRequestNotifAPIView.as_view(), name="game-request-response-notif"),  
]
