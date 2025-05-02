from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from authentication.models.User import User
from django.contrib.auth.hashers import check_password

class UpdatePasswordView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        data = request.data
        
        old_password = data.get('old_password')
        new_password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        # Vérifier que tous les champs nécessaires sont fournis
        if not all([old_password, new_password, confirm_password]):
            return Response({
                'status': 'error',
                'error_code': 400,
                "message": "Please provide all required fields."
            },status=status.HTTP_200_OK)
        
        # Vérifier que le mot de passe actuel est correct
        if not check_password(old_password, user.password):
            return Response({
                'status': 'error',
                'error_code': 400,
                "message": "Actual password is incorrect."
            },status=status.HTTP_200_OK)
        
        # Vérifier que les deux nouveaux mots de passe correspondent
        if new_password != confirm_password:
            return Response({
                'status': 'error',
                'error_code': 400,
                "message": "Passwords do not match."
            },status=status.HTTP_200_OK)
        
        # Mettre à jour le mot de passe
        user.set_password(new_password)
        user.save()
        
        return Response({
            "status": "success",
            "message": "Password updated successfully.",
        }, status=status.HTTP_200_OK)