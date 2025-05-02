from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework import status
from authentication.models.User import User
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

class IsOauthView(RetrieveAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, *args, **kwargs):
        
        if request.user.is_anonymous:
            print("⚠️ Utilisateur non authentifié")
            return Response({"error": "Utilisateur non authentifié"}, status=401)
        
        if request.user.enabled_oauth:
            print("🔐 Utilisateur OAuth")
            return Response({"oauth": True}, status=status.HTTP_200_OK)
        else:
            print("🔓 Utilisateur non OAuth")
            return Response({"oauth": False}, status=status.HTTP_200_OK)