from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import validate_email


class UserManager(BaseUserManager):

    def email_validator(self, email):
        try:
            validate_email(email)
        except ValidationError as e:
            raise ValidationError(_('please enter a valid email adress')) from e

    def create_user(self, email, username, password, **extra_fields):
        if not email:
            raise ValueError(_('an email adress is required'))
        if not username:
            raise ValueError(_('a username is required'))
        if not password:
            raise ValueError(_('The Password field must be set'))

        email = self.normalize_email(email)
        self.email_validator(email)

        user = self.model(
            email=self.normalize_email(email),
            username=username,
            **extra_fields
        )
        # set_password is a method inside the BaseUserManager that
        # hashes the password while saving it
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('is_staff must be set to True for superuser'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('is_superuser must be set to True for superuser'))
        if extra_fields.get('is_verified') is not True:
            raise ValueError(_('is_verified must be set to True for superuser'))

        user = self.create_user(
            email, username, password, **extra_fields
        )

        user.save(using=self._db)
        return user
