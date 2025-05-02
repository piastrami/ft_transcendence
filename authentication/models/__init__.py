# this line is needed so that AUTH_USER_MODEL (in setting.py) 
# finds the customed user model which has to be in this format:
# 'app_name.ModelName', in our case: 'user_management.User'
from .User import User