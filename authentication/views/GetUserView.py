from rest_framework import views, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from authentication.models.User import User

class GetUserView(APIView):
    """
    API view to look up a user by username or ID.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        username = request.query_params.get('username')
        user_id = request.query_params.get('id')

        # Vérifier si au moins un paramètre est fourni
        if not username and not user_id:
            return Response(
                {"error": "Vous devez fournir un nom d'utilisateur ou un ID"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Recherche par nom d'utilisateur
            if username:
                user = get_object_or_404(User, username=username)
                return Response({
                    "id": user.id
                })
            
            # Recherche par ID
            if user_id:
                try:
                    user_id = int(user_id)
                except ValueError:
                    return Response(
                        {"error": "L'ID doit être un nombre entier"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                user = get_object_or_404(User, id=user_id)
                return Response({
                    "username": user.username
                })
                
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )