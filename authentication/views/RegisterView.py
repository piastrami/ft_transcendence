from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from ..serializers.RegisterSerializer import RegisterSerializer
from rest_framework.exceptions import ValidationError

# DEBUG ##############################
# import logging
# logger = logging.getLogger(__name__)
######################################

class RegisterView(APIView):

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    # DEBUG ##############################
    def get(self, request):
        return Response({'message': 'GET method works!'}, status=200)
    ######################################

    def post(self, request):
        # logger.info(f"Request data: {request.data}") # DEBUG
        serializer = RegisterSerializer(data=request.data)
        try:
            if serializer.is_valid(raise_exception=True):
                serializer.save()
                user=serializer.data
                #send email function user['email']
                username = user.get('username')
                return Response({
                    'data': user,
                    'message': f'user {username} successfully created',
                }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            # logger.error(f"Validation error: {e}")
            formatted_errors = {}
            for field, messages in e.detail.items():
                formatted_errors[field] = ", ".join(messages)
            return Response({
                'status': 'error',
                'message': formatted_errors,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_200_OK)
