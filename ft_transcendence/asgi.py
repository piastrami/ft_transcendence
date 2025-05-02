import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ft_transcendence.settings")
from django.core.asgi import get_asgi_application

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from authentication.middleware import JwtAuthMiddleware

from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns
from pong.routing import websocket_urlpatterns as pong_websocket_urlpatterns
from notifications.routing import websocket_urlpatterns as notif_websocket_urlpatterns

websocket_urlpatterns = chat_websocket_urlpatterns + pong_websocket_urlpatterns + notif_websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JwtAuthMiddleware(URLRouter(websocket_urlpatterns))
            ),
    }
)