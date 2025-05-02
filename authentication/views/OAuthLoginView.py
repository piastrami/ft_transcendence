from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from requests_oauthlib import OAuth2Session
from django.shortcuts import redirect
from authentication.models.User import User
from rest_framework_simplejwt.tokens import RefreshToken
import requests
from django.contrib.auth import login
from authentication.utils import send_otp
from rest_framework import status
from django.core.files.base import ContentFile
from io import BytesIO
from profiles.models.UserProfile import UserProfile
from django.db.models.signals import post_save
from profiles.signals import create_user_profile, save_user_profile
from django.db import IntegrityError
import os
# TO DEBUG ##############################
# import logging
# logger = logging.getLogger(__name__)
########################################

class OAuthLoginView(APIView):

    def get(self, request):
        code = request.GET.get('code')
        if code:
            # Exchange the code for the access token
            # logger.info(f"Code: {code}")
            access_token = self.exchange_code_for_token(code)
            # logger.info (f"Access token: {access_token}")
            if access_token:
                user_data = self.get_user_data_from_42(access_token)
                if user_data:
                    user = self.authenticate_or_create_user(user_data, access_token)
                    # logger.error(f"User authenticated successfully: {user}")
                    if not user:
                        host_ip = os.environ.get('HOST_IP', request.get_host().split(':')[0])
                        url = f'https://{host_ip}:8000/signup?oauth_error=user_exists'
                        return redirect(url)
                    send_otp(user)
                    return redirect(f'/otp?username={user.username}')
                return Response({
                    'status': 'failed',
                    'message': 'Failed to fetch user data',
                }, status=status.HTTP_400_BAD_REQUEST)
            return Response({
                        'status': 'failed',
                        'message': 'Failed to exchange code for token',
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        # If no code is present, initiate the OAuth flow
        # Ensure the redirect URI matches exactly what's registered on 42's API dashboard
        oauth = OAuth2Session(
            settings.API_42_UID,
            redirect_uri=settings.API_42_REDIRECT_URI
        )
        authorization_url = "https://api.intra.42.fr/oauth/authorize"
        auth_url, state = oauth.authorization_url(authorization_url)
        request.session['oauth_state'] = state
        return redirect(auth_url)
    
    def exchange_code_for_token(self, code):
        token_url = "https://api.intra.42.fr/oauth/token"
        data = {
            'grant_type': 'authorization_code',
            'client_id': settings.API_42_UID,
            'client_secret': settings.API_42_SECRET,
            'code': code,
            'redirect_uri': settings.API_42_REDIRECT_URI
        }
        try:
            response = requests.post(token_url, data=data)
            response.raise_for_status()  # Raise an exception for bad status codes
            return response.json().get('access_token')
        except requests.exceptions.RequestException as e:
            print(f"Token exchange error: {e}")
            return None
        
    def get_user_data_from_42(self, access_token):
        user_info_url = "https://api.intra.42.fr/v2/me"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        try:
            response = requests.get(user_info_url, headers=headers)
            response.raise_for_status()  # Raise an exception for bad responses
            return response.json()
        except requests.exceptions.RequestException as e:
            # logger.info(f"Error fetching user data: {e}")
            return None
        
    def authenticate_or_create_user(self, user_data, access_token):

        # disable signals to prevent creating a UserProfile when a User is created at the end of the function
        post_save.disconnect(create_user_profile, sender=User)
        post_save.disconnect(save_user_profile, sender=User)

        try:
            username = user_data.get('login')
            email = user_data.get('email')
            oauth_user_id = user_data.get('id')
            image_url = None
            if user_data.get('image') and user_data['image'].get('link'):
                image_url = user_data['image']['link']
                
            # logger.error(f"Authenticated email: {email}, username: {username}, image_url: {image_url}")

            if not username:
                username = email.split('@')[0]  # Use email prefix as fallback
            
            user, created = User.objects.get_or_create(
                email=email,
                defaults={'username': username}
            )

            if created:
                user.save()

            user.enabled_oauth = True
            user.oauth_access_token = access_token
            user.oauth_user_id = oauth_user_id
            user.save()

            if created or user.oauth_user_id != oauth_user_id:
                user.enabled_oauth = True
                user.oauth_access_token = access_token
                user.oauth_user_id = oauth_user_id
                user.save()
            
            user_profile, created = UserProfile.objects.update_or_create(
                user=user,
                defaults={'avatar_url': image_url} if image_url else {}
            )
            
            if image_url:
                user_profile.avatar_url = image_url
                user_profile.save()
        
            return user
        except Exception as e:
            # logger.error(f"error: {e}")
            return None

        # enable signals again for automatic UserProfile creation when a User is created
        finally:
            post_save.connect(create_user_profile, sender=User)
            post_save.connect(save_user_profile, sender=User)
    
