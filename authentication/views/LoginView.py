from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from ..serializers.LoginSerializer import LoginSerializer
from authentication.utils import send_otp
from authentication.models import User
from rest_framework.exceptions import ValidationError
# TO DEBUG ##############################
# import logging
# logger = logging.getLogger(__name__)
########################################
class LoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        try:
            # Regular synchronous serializer validation
            resend_otp = request.data.get('resend_otp', False)
            email_or_username = request.data.get('email_or_username')
            
            if resend_otp:
                try:
                    user = User.objects.get(username=email_or_username)
                    # Resend OTP
                    send_otp(user)
                    return Response({
                        'status': 'pending_otp',
                        'message': 'OTP resent to your email',
                        'username': user.username,
                        'redirect_url': '/otp',
                    }, status=status.HTTP_200_OK)
                except User.DoesNotExist:
                    return Response({
                        'status': 'error',
                        'error_code': 401,
                        'message': 'User not found',
                    }, status=status.HTTP_200_OK) 
                
            # Regular login flow
            serializer = LoginSerializer(data=request.data)
            
            try:
                serializer.is_valid(raise_exception=True)
                user = serializer.validated_data['user']
                
                if user:
                    #logger.info(f"User authenticated successfully: {user}")
                    # Send OTP
                    send_otp(user)
                    return Response({
                        'status': 'pending_otp',
                        'message': 'OTP sent to your email',
                        'username': user.username,
                        'redirect_url': '/otp',
                    }, status=status.HTTP_200_OK)
                
                #logger.error("Authentication failed: User not found or invalid credentials.")
                return Response({
                    'status': 'error',
                    'error_code': 401,
                    'message': 'Login failed',
                }, status=status.HTTP_200_OK)  
                
            except ValidationError as e:
                #logger.error(f"Login error: {str(e)}")
                formatted_errors = {}
                for field, messages in e.detail.items():
                    formatted_errors[field] = ", ".join(messages)
                return Response({
                    'status': 'error',
                    'error_code': 400,
                    'message': formatted_errors,
                }, status=status.HTTP_200_OK) 
                
        except Exception as e:
            #logger.error(f"Unexpected error in login view: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'error_code': 500,
                'message': str(e),
            }, status=status.HTTP_200_OK) 