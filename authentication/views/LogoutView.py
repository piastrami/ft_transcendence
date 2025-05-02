from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
import logging
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

#logger = logging.getLogger(__name__)

class LogoutView(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Récupérer le refresh token
            refresh_token = request.data.get('refresh_token')
            if not refresh_token:
                return Response({'success': False, 'message': 'Refresh token is required.'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            # Blacklister le token spécifique fourni
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            # Blacklister tous les tokens existants de l'utilisateur pour une sécurité maximale
            if request.user.is_authenticated:
                tokens = OutstandingToken.objects.filter(user_id=request.user.id)
                for token in tokens:
                    # Éviter de blacklister deux fois le même token
                    BlacklistedToken.objects.get_or_create(token=token)
            
            # Reset OTP fields
            user = request.user
            user.otp = None
            user.otp_secret = None
            user.otp_expiry = None
            user.save()
            
            #logger.info(f"User {user.username} logged out and OTP reset.")
            return Response({'success': True, 'message': 'Successfully logged out.'}, 
                           status=status.HTTP_200_OK)
            
        except TokenError as e:
            #logger.error(f"Invalid refresh token: {e}")
            return Response({'success': False, 'message': 'Invalid refresh token.'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            #logger.exception(f"Unexpected error: {e}")
            return Response({'success': False, 'message': str(e)}, 
                           status=status.HTTP_500_INTERNAL_SERVER_ERROR)