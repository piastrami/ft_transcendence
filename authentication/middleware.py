# in order to retrieve the user from the scope 
from jwt import decode 
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.conf import settings 
from urllib.parse import parse_qs

# import logging
# logger = logging.getLogger(__name__)

class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Extract token from authorization header
        # from authentication.models import User # not at the top of the file to prevent premature access 
        headers = dict(scope['headers'])
        jwt_token = None
        
        for key, value in headers.items():
            if key == b'authorization':
                jwt_token = value.decode('utf-8').split(' ')[1]
                #logger.info("JWT token in the back from header is: %s", jwt_token)
                break
        
        if not jwt_token:
            query_string = scope.get("query_string", b"").decode("utf-8")
            query_params = parse_qs(query_string)
            token_list = query_params.get("token")
            if token_list:
                jwt_token = token_list[0]
                #logger.info(f"Extracted JWT from query string: {jwt_token}")  # Debugging

        if jwt_token:
            #logger.info("JWT token in the back from query params is: %s", jwt_token)
            try:
                payload = decode(
                    jwt_token, 
                    settings.SIMPLE_JWT['SIGNING_KEY'], 
                    algorithms=[settings.SIMPLE_JWT['ALGORITHM']])
                
                user = await database_sync_to_async(get_user_model().objects.get)(id=payload['user_id'])
                scope['user'] = user
                #logger.info(f"Authenticated user: {scope.get('user')}")
            except Exception as e:
                #logger.error(f"JWT decoding failed: {e}")  # Log any errors
                scope['user'] = AnonymousUser()
        else:
            #logger.warning("No JWT token found, setting AnonymousUser")  # Debugging
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)