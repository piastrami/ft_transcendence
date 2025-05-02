from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from authentication.models.User import User
from django.contrib.auth.hashers import check_password

class UpdateUsernameView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        user = request.user
        data = request.data
        
        new_username = data.get('username')
        
        # Vérifier que le nom d'utilisateur est fourni
        if not new_username:
            return Response({
                'status': 'error',
                'error_code': 400,
                "message": "Please provide a username."
            },status=status.HTTP_200_OK)
        
        # Vérifier si le nom d'utilisateur est déjà utilisé
        if User.objects.filter(username=new_username).exclude(id=user.id).exists():
            return Response({
                'status': 'error',
                'error_code': 400,
                "message": "This username is already taken."
            },status=status.HTTP_200_OK)
        
        # Mettre à jour le nom d'utilisateur
        old_username = user.username
        user.username = new_username
        user.save()
        
        return Response({
            "status": "success",
            "message": "Username updated successfully.",
            "username": new_username,
            "old_username": old_username
        }, status=status.HTTP_200_OK)