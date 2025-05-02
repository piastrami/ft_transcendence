from django.urls import re_path
from .consumers import PongConsumer

websocket_urlpatterns = [
    re_path(r'^ws/pong/$', PongConsumer.as_asgi()),
    re_path(r'ws/pong/(?P<game_id>\w+)/$', PongConsumer.as_asgi()),
]