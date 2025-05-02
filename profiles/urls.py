from django.urls import path

from .views.UsernameView import UsernameView
from .views.GetGamesDatabyUserView import GetGamesDatabyUserView
from profiles.views.UsernameView import UsernameView
from profiles.views.BlockUserView import BlockUserView , BlockHistoryListView

from profiles.views.ProfileView import ProfileView
from profiles.views.CheckIfProfileExists import CheckIfProfileExists
from profiles.views.FriendShipView import FriendshipView, FriendshipInBlockView
from profiles.views.UserStatusView import OnlineUsersView
from profiles.views.AvatarUploadView import AvatarUploadView
from profiles.views.UpdatePasswordView import UpdatePasswordView
from profiles.views.UpdateEmailView import UpdateEmailView
from profiles.views.UpdateUsernameView import UpdateUsernameView
from profiles.views.BlockUserView import CheckMutualBlockView

# /!\ all the views using APIView must use .as_view() in the urls.py file

urlpatterns = [

    # utils
    path('username/', UsernameView.as_view(), name='UsernameView'),
    path('check/<str:username>/', CheckIfProfileExists.as_view(), name='CheckIfProfileExists'),
    
    # profile view
    path('view/<str:username>/', ProfileView.as_view(), name='profile'),

    # dashboard
    path('get-games/<str:username>/', GetGamesDatabyUserView.as_view(), name='GetGamesDatabyUserView'),
    
    # settings
    path('upload-avatar/', AvatarUploadView.as_view(), name='upload-avatar'),
    path('update-password/', UpdatePasswordView.as_view(), name='update-password'),
    path('update-email/', UpdateEmailView.as_view(), name='update-email'),
    path('update-username/', UpdateUsernameView.as_view(), name='update-username'),
    
    # blocked users
    path('block/', BlockUserView.as_view(), name='block-user'),  # POST username in body
    path('unblock/<str:username>/', BlockUserView.as_view(), name='unblock-user'),  # DELETE username
    path('blocked/check/<str:username>/', CheckMutualBlockView.as_view(), name='check-blocked-status'),
    path('<str:username>/blocked/list/', BlockUserView.as_view(), name='blocked-users-list'),
    path('blocked/history/', BlockHistoryListView.as_view(), name='blocked_history_list'),
    
    #FriendShip
    path("friendship/accept/", FriendshipView.as_view(), name="friend-request-accept"),
    path("friends/list/<str:username>/", FriendshipView.as_view(), name="friend-list"),
    path("remove-friend/<str:username>/", FriendshipView.as_view(), name="friend-remove"),
    path("remove-blocked-friend/<str:username>/", FriendshipInBlockView.as_view(), name="blocked-friend-remove"),

    # user online status
    path("online/users/", OnlineUsersView.as_view(), name="online-users"),
]
