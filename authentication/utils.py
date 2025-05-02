import pyotp
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.conf import settings
from authentication.models.User import User
import logging
from dotenv import load_dotenv
import os

load_dotenv()

# logger = logging.getLogger(__name__)

def send_otp(user):
    """
    Generates and sends a simple OTP email for single page applications.
    The email is text-based since we don't need templates.
    """
    
    try:
        # Generate OTP
        # if not user.otp_secret:
        user.otp_secret = pyotp.random_base32()
        user.save()

        totp = pyotp.TOTP(user.otp_secret, interval=300)
        otp = totp.now()
        
        # Save OTP details to user
        user.otp = otp
        user.otp_expiry = timezone.now() + timedelta(minutes=5)
        user.save()
        
        # Create a simple but clear email message
        subject = 'Your Authentication Code'
        message = f"""
        Hello {user.username},

        Your authentication code is: {otp}

        This code will expire in 5 minutes.

        For security reasons, do not share this code with anyone.
        If you didn't request this code, please ignore this email.

        Best regards,
        Skydjangjao Team
                """
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        # logger.info(f"OTP email sent successfully to {user.email}")
        # logger.info(f"Your OTP code : {user.otp}")
        return True
        
    except Exception as e:
        # logger.error(f"Failed to send OTP email: {str(e)}")
        return False

def send_reset_email(user):

    """Generate password reset token, save it, and send reset email."""
    token = get_random_string(length=30)  # Generate a secure random token

    # Store the reset token and expiry time in the database
    user.password_reset_token = token
    user.password_reset_expiry = timezone.now() + timezone.timedelta(minutes=30)
    user.save()
    server_ip = os.getenv('HOST_IP')
    if not server_ip:
        server_ip = "127.0.0.1"
    reset_link = f"https://{server_ip}:8000/reset-password/{token}"

    # Send email
    send_mail(
        "Password Reset Request",
        f"Click the link below to reset your password:\n{reset_link}",
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )



    