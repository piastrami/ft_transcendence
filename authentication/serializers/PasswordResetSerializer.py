from rest_framework import serializers
from authentication.models.User import User
from django.utils import timezone
from authentication.utils import send_reset_email 

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
            if user.enabled_oauth: # Check if user is an OAuth user
                raise serializers.ValidationError("Cannot reset password for OAuth users.")
        except User.DoesNotExist:
            raise serializers.ValidationError("No account found with this email.")
        return value

    def create(self, validated_data):
        user = User.objects.get(email=validated_data['email'])
        send_reset_email(user) # Send password reset email
        return {"message": "Password reset link sent to your email."}


class PasswordResetConfirmSerializer(serializers.Serializer):

    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        token = data.get("token")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")
        
        if new_password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        try:
            user = User.objects.get(
                password_reset_token=token,
                password_reset_expiry__gt=timezone.now()
            )
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired token.")
        
        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_expiry = None
        user.save()

        return {"message": "Password reset successful."}