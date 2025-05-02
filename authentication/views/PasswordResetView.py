from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from authentication.serializers.PasswordResetSerializer import (
    PasswordResetSerializer, 
    PasswordResetConfirmSerializer
)
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from authentication.models.User import User
from django.utils import timezone
from rest_framework.permissions import AllowAny

from logging import getLogger
logger = getLogger(__name__)

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    """Handles password reset requests (sends reset link)."""

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                    'status': 'success',
                    'error_code': 200,
                    'message': "Password reset link sent.",
                }, status=status.HTTP_200_OK) 
            # return Response({"message": "Password reset link sent."}, status=status.HTTP_200_OK)
        return Response({
                    'status': 'error',
                    'error_code': 400,
                    'message': "Failed to send reset link",
                }, status=status.HTTP_200_OK) 
        # return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    """Handles password reset confirmation (validates token & changes password)."""
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ValidatePasswordResetTokenView(APIView):
    def post(self, request):
        token = request.data.get("token")
        
        try:
            user = User.objects.get(
                password_reset_token=token,
                password_reset_expiry__gt=timezone.now()
            )
            return Response({"valid": True}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"valid": False, "message": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
