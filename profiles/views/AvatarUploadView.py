from rest_framework import status
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from profiles.models.UserProfile import UserProfile
from profiles.serializers.AvatarUploadSerializer import AvatarUploadSerializer

class AvatarUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, format=None):
        user_profile = UserProfile.objects.get(user=request.user)
        
        serializer = AvatarUploadSerializer(user_profile, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Supprimer l'ancien avatar si ce n'est pas l'avatar par défaut
            if user_profile.avatar and 'default.jpg' not in user_profile.avatar.name:
                # Gardez une référence à l'ancien fichier
                old_avatar = user_profile.avatar.path
                try:
                    import os
                    if os.path.exists(old_avatar):
                        os.remove(old_avatar)
                except Exception as e:
                    print(f"Erreur lors de la suppression de l'ancien avatar: {e}")
            
            # Si l'utilisateur avait une URL d'avatar externe (OAuth), la réinitialiser
            # car maintenant il utilise un avatar uploadé
            if user_profile.avatar_url:
                user_profile.oauth_with_customed_avatar = True
                
            # Enregistrer le nouvel avatar
            serializer.save()
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)