from django.urls import re_path
from .consumers import ChatConsumer

#\w+ means one or more alphanumeric characters
websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_name>\w+)/(?P<username>\w+)/$', ChatConsumer.as_asgi()),
]


