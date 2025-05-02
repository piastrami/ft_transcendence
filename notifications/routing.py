from django.urls import re_path
from notifications.consumers import NotificationConsumer

#\w+ means one or more alphanumeric characters
websocket_urlpatterns = [
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
]