from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from authentication.models.User import User
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from profiles.serializers.UserProfileSerializer import UserProfileSerializer
from profiles.models.UserProfile import UserProfile

class ProfileView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        print(user)
        profile = get_object_or_404(UserProfile, user=user)
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)

    def put(self, request, username):
        # Vérifier que l'utilisateur modifie son propre profil
        if request.user.username != username:
            return Response(
                {"detail": "Vous ne pouvez pas modifier le profil d'un autre utilisateur"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        profile = get_object_or_404(UserProfile, user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        
        if serializer.is_valid():
            if 'avatar' in request.FILES:
                profile.avatar = request.FILES['avatar']
            
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)