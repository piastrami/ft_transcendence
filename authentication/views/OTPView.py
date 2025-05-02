from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
import pyotp
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.contrib.auth import login
from authentication.models import User
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

# TO DEBUG ##############################
# import logging
# logger = logging.getLogger(__name__)
########################################

class OTPView(APIView):

    def post(self, request):
        username = request.data.get('username')
        otp = request.data.get('otp')

        user = get_object_or_404(User, username=username)
        otp_secret_key = user.otp_secret
        otp_valid_until = user.otp_expiry

        if not otp_secret_key or not otp_valid_until:
            return Response({'error': 'OTP data missing'}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() > otp_valid_until:
            return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(otp_secret_key, interval=300)
        if totp.verify(otp):
            user.backend = settings.AUTHENTICATION_BACKENDS[0]
            login(request, user)
            
            user.otp_secret = None  
            user.otp = None
            user.otp_expiry = None
            user.save()

            refresh = RefreshToken.for_user(user)
            # logger.info(f"Tokens generated for user: {user}")  # DEBUG 
            return Response({
                'message': 'OTP verified successfully',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
