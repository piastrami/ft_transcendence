from django.contrib.auth.backends import ModelBackend
from authentication.models.User import User

class EmailOrUsernameAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Permet la connexion avec email ou username
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=username)
            except User.DoesNotExist:
                return None
            # Check if the user is an OAuth user (has no password)
        if user.enabled_oauth:
            return None  # Prevent password-based login for OAuth users
    
         # Otherwise, check the password for regular users
        if password and user.check_password(password):
            return user

        return None