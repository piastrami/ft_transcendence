from pathlib import Path
from datetime import timedelta
import environ
import os

BASE_DIR = Path(__file__).resolve().parent
env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env('.env')
SECRET_KEY = env('SECRET_KEY')
host_ip = os.environ.get('HOST_IP', '')
DEBUG = True


INSTALLED_APPS = [
    'channels',
    'channels_redis',
    
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes', 
    'django.contrib.sessions',
    "django.contrib.sites",
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'django_extensions',
    'rest_framework', 
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'oauth2_provider',
    
    'authentication',
    'profiles',
    'pong',
    'chat',
    'notifications',
    'utils',
]

# for pannel admin
SITE_ID = 1

# Channels configuration
ASGI_APPLICATION = 'ft_transcendence.asgi.application'

# /!\ the position of the middlewares in the list sets priority /!\
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# SSL/HTTPS parameters
SECURE_SSL_REDIRECT = True  # HTTP>HTTPS
SESSION_ENGINE = 'django.contrib.sessions.backends.db' 
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True  # secure cookies
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

ALLOWED_HOSTS = ['*', 'django', 'daphne']  

ROOT_URLCONF = 'ft_transcendence.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ft_transcendence.wsgi.application'

# PostgreSQL database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),  
        'USER': env('DB_USER'),  
        'PASSWORD': env('DB_PASSWORD'),  
        'HOST': env('DB_HOST'),  
        'PORT': env('DB_PORT'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
]

MIN_PASSWORD_LENGTH = 6



LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True


# Static files 
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, '../static'),  # Dossier local pour les fichiers statiques
]
STATIC_ROOT = os.path.join(BASE_DIR, '../staticfiles') 

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# specifies the customed user model as the default user model
AUTH_USER_MODEL = 'authentication.User'

# customed authentication backend
# needed if we want a user to be able to log in with either their username or email
# /!\ the position of the middlewares in the list sets priority /!\
AUTHENTICATION_BACKENDS = [
    'authentication.backends.EmailOrUsernameAuthBackend', # the customed authentication class
    'django.contrib.auth.backends.ModelBackend',  # default
]

# Media files (images, videos, etc.)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
# to be able to upload avatars
os.makedirs(os.path.join(MEDIA_ROOT, 'avatars'), exist_ok=True)
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5 MB

OAUTH2_PROVIDER = {
    # this is the list of available scopes
    'SCOPES': {'read': 'Read scope', 'write': 'Write scope', 'groups': 'Access to your groups'},
    "ACCESS_TOKEN_EXPIRE_SECONDS": 3600,
    "ALLOWED_REDIRECT_URI_SCHEMES": ["http", "https"],
}

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=90),  # Durée de vie du token d'accès
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),    # Durée de vie du token de rafraîchissement
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,  # Active la blacklist après rotation des tokens
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SIGNIN_KEY'),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS
CORS_ALLOWED_ORIGINS = [
    f"https://{host_ip}:8000",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']



CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis", 6379)],
            "capacity": 10000,
            "expiry": 60,
          },
    },
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'ERROR',
        },
        'channels': {
            'handlers': ['console'],
            'level': 'ERROR',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'ERROR',
    },
}

# settings.py example for sending emails in development
DEFAULT_FROM_EMAIL = 'noreply@skydjangjao2.420042.xyz'
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
#EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST')
EMAIL_PORT = env('EMAIL_PORT')
EMAIL_USE_SSL = True #https://docs.djangoproject.com/en/5.1/ref/settings/#email-use-ssl
EMAIL_HOST_USER = env('EMAIL_HOST_USER')

# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = env('EMAIL_USER')
EMAIL_HOST_PASSWORD= env('EMAIL_HOST_PASSWORD')

# Enforce 2FA for all users
TWO_FACTOR_REQUIRED = True
TWO_FACTOR_AUTHENTICATION_METHODS = ['email']
TWO_FACTOR_EMAIL_CONFIRMATION_URL = DEFAULT_FROM_EMAIL

# 42 login
API_42_UID = env('API_42_UID')
API_42_SECRET = env('API_42_SECRET')
HOST_IP = env('HOST_IP')
PORT = '8000'
REDIRECT_PATH = '/o/login_42/'
API_42_REDIRECT_URI = f'https://{HOST_IP}:{PORT}{REDIRECT_PATH}'

#redis
REDIS_HOST = 'redis'
REDIS_PORT = 6379
REDIS_DB = 0