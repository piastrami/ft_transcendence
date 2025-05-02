from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

def media_serve(request, path):
    # print(f"Trying to serve media file: {path}")
    response = serve(request, path, document_root=settings.MEDIA_ROOT)
    # print(f"Response status: {response.status_code}")
    return response

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include("authentication.urls")), 
    path("authentication/", include("authentication.urls")), 
    path("profiles/", include("profiles.urls")), 
    path("chat/", include("chat.urls")),
    path("notifications/", include("notifications.urls")),
    path('pong/', include("pong.urls")), 
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    path('media/<path:path>', media_serve),

    # all the other routes are handled by the customed error page handler in the frontend
    re_path(r'^.*$', TemplateView.as_view(template_name="index.html"), name='spa'),
]

