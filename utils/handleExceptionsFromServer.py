from rest_framework.exceptions import ValidationError
from django.db.utils import DataError
from rest_framework import status as rest_status
from rest_framework.response import Response
# import logging
# logger = logging.getLogger(__name__)

def handle_exception(self, e):
    status_code = rest_status.HTTP_400_BAD_REQUEST
    if hasattr(e, 'status'):
        status_code = e.status
    if hasattr(e, 'detail'):
        # logger.error(f"error: {str(e)}")
        formatted_errors = {field: ", ".join(messages) for field, messages in e.detail.items()}
        return Response({
            'status': 'error',
            'message': formatted_errors,
        }, status=status_code)
    elif isinstance(e, DataError):
        # logger.error(f"Data error: {str(e)}")
        return Response({
            'status': 'error',
            'message': 'Invalid data input. Please check the provided data.',
        }, status=status_code)
    else:
        return Response({
            'status': 'error',
            'message': str(e),
        }, status=status_code)
        # logger.error(f"Unexpected error: {str(e)}")