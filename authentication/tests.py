from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User
from django.utils import timezone
import pyotp
import os 
from unittest.mock import patch

User = get_user_model()

class UserManagerTests(APITestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            email='normal@user.com',
            username='normaluser',
            password='foo'
        )
        self.assertEqual(user.email, 'normal@user.com')
        self.assertEqual(user.username, 'normaluser')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        # self.assertFalse(user.enabled_2FA)
        self.assertFalse(user.enabled_oauth)
        
        # Password is set and hashed
        self.assertTrue(user.check_password('foo'))
        self.assertNotEqual(user.password, 'foo')

    def test_create_superuser(self):
        admin_user = User.objects.create_superuser(
            email='super@user.com',
            username='superuser',
            password='foo'
        )
        self.assertEqual(admin_user.email, 'super@user.com')
        self.assertEqual(admin_user.username, 'superuser')
        self.assertTrue(admin_user.is_active)
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
        self.assertTrue(admin_user.is_verified)

    def test_create_user_without_email(self):
        with self.assertRaises(ValueError) as context:
            User.objects.create_user(
                email='',
                username='testuser',
                password='foo'
            )
        self.assertEqual(str(context.exception), str(_('an email adress is required')))

    def test_create_user_without_username(self):
        with self.assertRaises(ValueError) as context:
            User.objects.create_user(
                email='test@example.com',
                username='',
                password='foo'
            )
        self.assertEqual(str(context.exception), str(_('a username is required')))

    def test_create_user_without_password(self):
        with self.assertRaises(ValueError) as context:
            User.objects.create_user(
                email='test@example.com',
                username='testuser',
                password=''
            )
        self.assertEqual(str(context.exception), str(_('The Password field must be set')))

    def test_create_user_with_invalid_email(self):
        with self.assertRaises(DjangoValidationError) as context:
            User.objects.create_user(
                email='invalid-email',
                username='testuser',
                password='foo'
            )

class UserModelTests(APITestCase):
    def setUp(self):
        self.user_data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'testpass123'
        }
        self.user = User.objects.create_user(**self.user_data)

    def test_user_str_method(self):
        self.assertEqual(str(self.user), self.user.username)

    def test_email_is_normalized(self):
        email = 'test2@EXAMPLE.com'  # Changed email to avoid duplicate
        user = User.objects.create_user(
            email=email,
            username='test2',
            password='foo'
        )
        self.assertEqual(user.email, email.lower())

    def test_email_unique_constraint(self):
        with self.assertRaises(Exception) as context:  # Could be IntegrityError or ValidationError
            User.objects.create_user(
                email=self.user_data['email'],  # Same email as setUp user
                username='different',
                password='foo'
            )

#Need to prevent the redirect from HTTP to HTTPS for the following tests:

class TestHTTPSMixin:
    """
    Prevents Django from redirecting http to https, making the use of APIClient() possible
    """

    @classmethod
    def setUpClass(cls):
        cls._original_secure_ssl_redirect = os.environ.get('SECURE_SSL_REDIRECT', None)
        os.environ['SECURE_SSL_REDIRECT'] = 'False'
        super().setUpClass()
    
    @classmethod
    def tearDownClass(cls):
        if cls._original_secure_ssl_redirect is not None:
            os.environ['SECURE_SSL_REDIRECT'] = cls._original_secure_ssl_redirect
        else:
            os.environ.pop('SECURE_SSL_REDIRECT', None)
        super().tearDownClass()

    def setUp(self):
        self.https_patch = patch('django.http.request.HttpRequest.is_secure', return_value=True)
        self.https_patch.start()
        super().setUp()
    
    def tearDown(self):
        self.https_patch.stop()
        super().tearDown()

# # Login and logout tests # 

class AuthenticationTests(TestHTTPSMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        # self.client.defaults['wsgi.url_scheme'] = 'https'
        # Create a test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.login_url = reverse('LoginView')
        self.otp_url = reverse('OTPView')

    def test_login_valid_credentials(self):
        response = self.client.post(self.login_url, {
            'email_or_username': 'testuser',
            'password': 'testpass123'
        }, format='json')
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'pending_otp')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('username', response.data)
        self.assertEqual(response.data['username'], 'testuser')

    def test_otp_valid(self):
        #Setting OTP directly/manually in database just to check validation, actual test with comparison in logs will be done in front
        response = self.client.post(self.login_url, {
            'email_or_username': 'testuser',
            'password': 'testpass123' 
        }, format='json')

        self.user.otp_secret = 'TESTSECRET'
        self.user.otp_expiry = timezone.now() + timezone.timedelta(minutes=5)
        self.user.save()

        totp = pyotp.TOTP(self.user.otp_secret, interval=300)
        valid_otp = totp.now()
        response = self.client.post(self.otp_url, {
            'username': 'testuser',
            'otp': valid_otp,
        }, format='json')

        self.assertIn('message', response.data)
        self.assertEqual(response.data['message'], 'OTP verified successfully')
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_otp_invalid(self):
        response = self.client.post(self.login_url, {
            'email_or_username': 'testuser',
            'password': 'testpass123' 
        }, format='json')

        self.user.otp_secret = 'TESTSECRET'
        self.user.otp_expiry = timezone.now() + timezone.timedelta(minutes=5)
        self.user.save()

        response = self.client.post(self.otp_url, {
            'username': 'testuser',
            'otp': '123456',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Invalid OTP')

    def test_otp_expired(self):
        response = self.client.post(self.login_url, {
            'email_or_username': 'testuser',
            'password': 'testpass123' 
        }, format='json')
        self.user.otp_secret = 'TESTSECRET'
        self.user.otp_expiry = timezone.now() - timezone.timedelta(minutes=5)
        self.user.save()

        totp = pyotp.TOTP(self.user.otp_secret, interval=300)
        valid_otp = totp.now()
        response = self.client.post(self.otp_url, {
            'username': 'testuser',
            'otp': valid_otp,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'OTP expired')

    def test_resend_otp(self):
        response = self.client.post(self.login_url, {
            'email_or_username': 'testuser',
            'resend_otp': True
        }, format='json')

        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'pending_otp')
        self.assertIn('message', response.data)
        self.assertEqual(response.data['message'], 'OTP resent to your email')
        self.assertIn('username', response.data)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertIn('redirect_url', response.data)
        self.assertEqual(response.data['redirect_url'], '/otp')

    def test_login_invalid_credentials(self):
        response = self.client.post(self.login_url, {
            'email_or_username': 'testuser',
            'password': 'wrongpassword'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'error')
        self.assertIn('error_code', response.data)
        self.assertEqual(response.data['error_code'], 400)
        self.assertIn('message', response.data)

    def test_login_missing_fields(self):
        # Test missing username
        response = self.client.post(self.login_url, {
            'password': 'testpass123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'error')
        self.assertIn('error_code', response.data)
        self.assertEqual(response.data['error_code'], 400)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['message'], {'email_or_username': 'This field is required.'})

        # Test missing password
        response = self.client.post(self.login_url, {
            'email_or_username': 'testuser'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'error')
        self.assertIn('error_code', response.data)
        self.assertEqual(response.data['error_code'], 400)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['message'], {'password': 'This field is required.'})

    def test_login_with_email(self):
        # Test if login works with email instead of username
        response = self.client.post(self.login_url, {
            'email_or_username': 'test@example.com',  # Using email as username
            'password': 'testpass123'
        }, format='json')
        
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'pending_otp')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('username', response.data)
        self.assertEqual(response.data['username'], 'testuser')

class LogoutTests(TestHTTPSMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        # self.client.defaults['wsgi.url_scheme'] = 'https'
        self.user = User.objects.create_user(
            email='test2@example.com',
            username='testuser2',
            password='testpass123'
        )
        self.logout_url = reverse('LogoutView')

        # Login first
        self.login_url = reverse('LoginView')
        self.otp_url = reverse('OTPView')
        response = self.client.post(self.login_url, {
            'email_or_username': 'testuser2',
            'password': 'testpass123'
        }, format='json')

        self.user.otp_secret = 'NEWTESTSECRET'
        self.user.otp_expiry = timezone.now() + timezone.timedelta(minutes=5)
        self.user.save()

        totp = pyotp.TOTP(self.user.otp_secret, interval=300)
        valid_otp = totp.now()
        response = self.client.post(self.otp_url, {
            'username': 'testuser2',
            'otp': valid_otp,
        }, format='json')
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.access_token = response.data['access']
        self.refresh_token = response.data['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def test_logout_success(self):
        response = self.client.post(self.logout_url, {
            'refresh_token': self.refresh_token
        }, format='json')
        self.assertEqual(response.data['message'], 'Successfully logged out.')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)

    def test_logout_without_auth(self):
        # Remove authentication
        self.client.credentials()
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class RegisterTests(TestHTTPSMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        # self.client.defaults['wsgi.url_scheme'] = 'https'
        self.register_url = reverse('RegisterView')

    def test_register_success(self):
        response = self.client.post(self.register_url, {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'newpass123',
            'password2': 'newpass123'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_register_duplicate_email(self):
        # Create a user first
        User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )

        # Try to register with same email
        response = self.client.post(self.register_url, {
            'email': 'test@example.com',
            'username': 'differentuser',
            'password': 'newpass123',
            'password2': 'newpass123'
        }, format='json')
        
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'error')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_register_duplicate_username(self):
        # Create a user first
        User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )

        # Try to register with same username
        response = self.client.post(self.register_url, {
            'email': 'different@example.com',
            'username': 'testuser',
            'password': 'newpass123',
            'password2': 'newpass123'
        }, format='json')
        
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'error')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_register_invalid_email(self):
        response = self.client.post(self.register_url, {
            'email': 'invalid-email',
            'username': 'newuser',
            'password': 'newpass123',
            'password2': 'newpass123'
        }, format='json')

        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'error')
        self.assertEqual(response.status_code, status.HTTP_200_OK)