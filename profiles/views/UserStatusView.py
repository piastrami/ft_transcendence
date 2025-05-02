from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
import redis
from authentication.models.User import User  # Ensure correct import based on your project structure

#import logging
#logger = logging.getLogger(__name__)

# Connect to Redis
redis_client = redis.StrictRedis(host='redis', port=6379, db=0, decode_responses=True)

class OnlineUsersView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        #logger.info("\033[65mAPI View to retrieve online users\033[0m")
        online_users = []
        # Fetch all keys storing online user statuses
       
        for key in redis_client.keys("user_online:*"):
            # user_id = key.split(":")[1]
            user_name = key.split(":")[1]
            try:
                # user = User.objects.get(id=user_id)
                user = User.objects.get(username=user_name)

                online_users.append(user.username)  # Return username instead of ID
            except User.DoesNotExist:
                continue  # Ignore users that don't exist
        #logger.info(f"\033[65monline users: {online_users}\033[0m")
        return Response({"online_users": online_users})  # Ensure frontend expects this key
