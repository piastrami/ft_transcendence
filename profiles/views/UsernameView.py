from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

# The RetrieveAPIView class provides a get method that handles the GET request and returns the serialized data.
class UsernameView(RetrieveAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, *args, **kwargs):
        
        if request.user.is_anonymous:
            return Response({"error": "Utilisateur non authentifié"}, status=401)

        return Response({"username": request.user.username})