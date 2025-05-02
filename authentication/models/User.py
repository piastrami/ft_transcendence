from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils.translation import gettext_lazy as _
from django.db import models
from django.utils import timezone
from authentication.models.UserManager import UserManager
from django.conf import settings


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=255, unique=True, verbose_name=_('email address'))
    username = models.CharField(max_length=100, unique=True, verbose_name=_('username'))
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=True)  # Email verification
    # enabled_2FA = models.BooleanField(default=True)  # Two-factor authentication
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(default=timezone.now)
    # OTP fields
    otp = models.CharField(max_length=6, null=True, blank=True)
    otp_expiry = models.DateTimeField(blank=True, null=True)
    otp_secret = models.CharField(max_length=32, null=True, blank=True)  # To store the # OAuth fields
    enabled_oauth = models.BooleanField(default=False)
    oauth_access_token = models.CharField(max_length=255, blank=True, null=True)
    oauth_user_id = models.CharField(max_length=255, unique=True, null=True, blank=True)  # Store OAuth ID
    # Password Reset fields
    password_reset_token = models.CharField(max_length=50, null=True, blank=True)
    password_reset_expiry = models.DateTimeField(blank=True, null=True)

    # this field can only contain one value
    USERNAME_FIELD = 'email'
    # no need to add password field here because it's already mandatory in the AbstractBaseUser
    REQUIRED_FIELDS = ['username']

    # will call the UserManager class to create a user
    objects= UserManager()

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        # Prevent clashes with the default auth.User model
        swappable = 'AUTH_USER_MODEL'


    def __str__(self):
        return self.username
