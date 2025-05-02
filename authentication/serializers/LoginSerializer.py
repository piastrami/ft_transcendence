from rest_framework import serializers
from authentication.models.User import User
from rest_framework.exceptions import ValidationError
from django.contrib.auth import authenticate

class LoginSerializer(serializers.Serializer):
    email_or_username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email_or_username = data.get('email_or_username')
        password = data.get('password')

        if not email_or_username or not password:
            raise ValidationError('Email and password fields required')

        try:
            # Recherche avec username ou email
            user = User.objects.get(username=email_or_username)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=email_or_username)
            except User.DoesNotExist:
                raise ValidationError('User not found')
        
        # Check if this is an OAuth user
        if user.enabled_oauth:
            if password:  
                raise ValidationError("OAuth users cannot log in with a password")
            data['user'] = user  # Allow login without password
            return data
            
        # For regular users, validate password
        if not password:
            raise ValidationError('Password field required for regular users')
            
        authenticated_user = authenticate(
            username=email_or_username,  
            password=password
        )
        
        if not authenticated_user:
            raise ValidationError("Wrong password")
            
        data['user'] = authenticated_user
        return data