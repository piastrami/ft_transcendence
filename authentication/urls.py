from django.urls import path, include
from .views.LoginView import LoginView
from .views.RegisterView import RegisterView
from .views.LogoutView import LogoutView
from .views.Lists import ListUsers
from .views.HomepageView import homepage_view
from .views.OTPView import OTPView
from .views.OAuthLoginView import OAuthLoginView
from .views.PasswordResetView import PasswordResetRequestView, PasswordResetConfirmView, ValidatePasswordResetTokenView
from .views.IsOauthView import IsOauthView
from .views.VerifyTokenView import VerifyTokenView
from .views.LogoutView import LogoutView
from .views.GetUserView import GetUserView
from rest_framework_simplejwt.views import TokenRefreshView

# /!\
# all the classes based on APIView from DRF should use the .as_view() method
# /!\

urlpatterns = [
    # homepage
    path('', homepage_view, name='homepage'),
    # auth
    path('register/', RegisterView.as_view(), name='RegisterView'),
    path('login/', LoginView.as_view(), name='LoginView'),
    path('logout/', LogoutView.as_view(), name='LogoutView'),    
    # verify token
    path('verify-jwt/', VerifyTokenView.as_view(), name='VerifyTokenView'),
    path('refresh-token/', TokenRefreshView.as_view(), name='TokenRefreshView'),
    # list users
    path('list/', ListUsers.as_view(), name='ListUsers'),
    # OTP
    path('otp/', OTPView.as_view(), name='OTPView'),
    # 42 auth
    path('o/login_42/', OAuthLoginView.as_view(), name='42-login'),
    path('is_oauth/', IsOauthView.as_view(), name='is_oauth'),
    # reset password
    path('reset-password/', PasswordResetRequestView.as_view(), name='reset-password'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('password-reset-validate/', ValidatePasswordResetTokenView.as_view(), name='password-reset-validate'),
    # path("api/logout/", LogoutView.as_view(), name="logout"),
    # utils
    path('get-user/', GetUserView.as_view(), name='GetUserView'),
]

