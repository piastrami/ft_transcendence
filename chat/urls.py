from django.urls import path

from chat.views.ChatRoomAPIView import ChatRoomListCreateAPIView
from chat.views.MessageAPIView import (
    MessageListCreateAPIView,
    MessageUpdateAPIView,
    MessageAutoUpdateAPIView,
    CheckUnreadMessagesAPIView,
)
from chat.views.GameRequestView import GameRequestAPIView, GameRequestAutoAPIView

urlpatterns = [
    path('rooms/', ChatRoomListCreateAPIView.as_view(), name='chatroom-list-create'),
    path('messages/<str:room_name>/', MessageListCreateAPIView.as_view(), name='room-message-list-create'),
    path('check-unread-messages/', CheckUnreadMessagesAPIView.as_view(), name='check-unread-messages'),
    path('messages/<int:room_id>/update/',  MessageUpdateAPIView.as_view(), name='room-message-status-update'),
    path('message/autoupdate/',  MessageAutoUpdateAPIView.as_view(), name='room-message-status-autoupdate'),

    # gameRequest
    path("game-request/", GameRequestAPIView.as_view(), name="game-request"),
    path("game-request/<int:room_id>/response/", GameRequestAPIView.as_view(), name="game-request-response"),
    path("game-request/autoupdate/", GameRequestAutoAPIView.as_view(), name="game-request-autoupdate"),
    path("games/", GameRequestAPIView.as_view(), name="game-list"),

]
