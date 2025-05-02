from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from profiles.models.UserProfile import UserProfile

class CheckIfProfileExists(RetrieveAPIView):
    # utilise par notre api_cli pong donc doit etre accessible sans authentification
    permission_classes = [AllowAny]
    
    def retrieve(self, request, username):
        print(f"Checking if user exists: {username}")
        try:
            user_profile = UserProfile.objects.get(user__username=username)
            print(f"User {username} found")
            return Response({"exists": True, "id": user_profile.id}, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            # print(f"User {username} NOT found")
            return Response({"exists": False}, status=status.HTTP_200_OK)