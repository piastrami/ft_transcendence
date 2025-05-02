from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

# import logging
# logger = logging.getLogger(__name__)

class VerifyTokenView(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Vérification du token JWT
        user = request.user
        # Si la requête arrive jusqu'ici, cela signifie que le token est valide
        # car IsAuthenticated l'a déjà vérifié
        return Response({"valid": True}, status=status.HTTP_200_OK)