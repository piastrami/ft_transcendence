from rest_framework import serializers
from authentication.serializers.UserSerializer import UserSerializer
from profiles.models.UserProfile import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    avatar = serializers.SerializerMethodField()
    friends = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'avatar', 'friends']
    
    def get_avatar(self, obj):
        """Retourne l'URL d'avatar appropriée en fonction du statut OAuth avec gestion robuste des fichiers manquants"""
        import os
        from django.conf import settings
        
        request = self.context.get('request')
        
        # oauth 42 api avatar
        if obj.user.enabled_oauth and obj.oauth_with_customed_avatar == False and obj.avatar_url:
            if obj.avatar_url.startswith(('http://', 'https://')):
                return obj.avatar_url 
            elif request:
                return request.build_absolute_uri(obj.avatar_url)
            else:
                return obj.avatar_url
        
        # uploaded avatar
        if obj.avatar and hasattr(obj.avatar, 'url'):
            # Vérifier si le fichier existe
            relative_path = obj.avatar.url.lstrip('/')
            if relative_path.startswith(settings.MEDIA_URL.lstrip('/')):
                relative_path = relative_path[len(settings.MEDIA_URL.lstrip('/')):]
            full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
            
            if os.path.exists(full_path):
                if request:
                    return request.build_absolute_uri(obj.avatar.url)
                else:
                    return obj.avatar.url
        
        # default avatar
        default_avatar = settings.MEDIA_URL + 'avatars/default.jpg'
        default_path = os.path.join(settings.MEDIA_ROOT, 'avatars/default.jpg')
        
        if os.path.exists(default_path):
            if request:
                return request.build_absolute_uri(default_avatar)
            else:
                return default_avatar
        
        # base64 fallback 
        return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjEwMCIgZmlsbD0iIzYzNzJmOCIvPjxwYXRoIGZpbGw9IiNmZmZmZmYiIGQ9Ik0xMDAgNTVjLTE1LjUgMC0yOCAxMi41LTI4IDI4czEyLjUgMjggMjggMjggMjgtMTIuNSAyOC0yOC0xMi41LTI4LTI4LTI4em0wIDExMmMtMjMuNCAwLTQzLjMtMTIuNS01NC43LTMxLjEgLjEtMTguMiAzNi42LTI4LjIgNTQuNy0yOC4yIDE4IDAgNTQuNSAxMC4xIDU0LjcgMjguMi0xMS40IDE4LjYtMzEuMyAzMS4xLTU0LjcgMzEuMXoiLz48L3N2Zz4K"

    
    def get_friends(self, obj):
        request = self.context.get('request')
        if not request:
            return []
            
        return [
            {
                'username': friend.user.username,
                'avatar': self.get_avatar(friend),
            }
            for friend in obj.friends.all()
        ]



