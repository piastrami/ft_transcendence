from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from authentication.models.User import User
from django.contrib.auth.hashers import check_password
from rest_framework.permissions import AllowAny
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class UpdateEmailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        user = request.user
        data = request.data
        old_email = data.get('old_email')
        new_email = data.get('email')
        
        # Vérifier que l'ancien email correspond bien à celui de l'utilisateur
        if old_email != user.email:
            return Response({
                'status': 'error',
                'error_code': 400,
                "message": "Current email address does not match."
            },status=status.HTTP_200_OK)
        
        # Vérifier le format du nouvel email avec le validateur de Django
        try:
            validate_email(new_email)
        except ValidationError:
            return Response({
                'status': 'error',
                'error_code': 400,
                "message": "New email has an invalid format."
            },status=status.HTTP_200_OK)
            
        # Vérifier si le nouvel email est déjà utilisé
        if User.objects.filter(email=new_email).exclude(id=user.id).exists():
            return Response({
                'status': 'error',
                'error_code': 400,
                "message": "Email address is already in use."
            },status=status.HTTP_200_OK)
            
        # Mettre à jour l'email
        user.email = new_email
        user.save()
        
        return Response({
            "status": "success",
            "message": "Email address updated successfully.",
            "email": new_email
        }, status=status.HTTP_200_OK)