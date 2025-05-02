# authentication app

## custom User model
our users must provide to register :
- an email
- a username
- a password

## custom authentication backend
A custom backend (file `backends.py`) allows users to login using either email or username.

## users creation command
A Python command located in `management/commands/create_users.py` enables automatic user creation each time the command `python manage.py create_users` is executed via the Makefile.


# need to implement in this app:

- Register / Login / Logout views with the right permissions
- JWT inside HTTPOnly cookie
- PyOTP library : genere des codes de verifications OTP(One-Time Password) pour des systemes d'authentification a deux facteur (2FA)
- 0Auth2
