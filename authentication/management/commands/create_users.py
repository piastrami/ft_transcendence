from django.core.management.base import BaseCommand

# to import our custom User model ##################
import sys
import os
current_dir = os.path.dirname(__file__)
parent_dir = os.path.abspath(os.path.join(current_dir, "../../"))
sys.path.append(parent_dir)
from authentication.models.User import User
####################################################

class Command(BaseCommand):
    help = 'Crée des utilisateurs par défaut pour le projet'

    def handle(self, *args, **kwargs):
        users = [
            {'username': 'admin', 'email': 'admin@pong.fr', 'password': 'adminpong', 'is_staff': True, 'is_superuser': True},
            {'username': 'info', 'email': 'info@pong.fr', 'password': 'infopong', 'is_staff': True, 'is_superuser': True},
            {'username': 'buse', 'email': 'buse@pong.fr', 'password': 'busepong'},
            {'username': 'felise', 'email': 'felise@pong.fr', 'password': 'felisepong'},
            {'username': 'pia', 'email': 'pia@pong.fr', 'password': 'piapong'},
            {'username': 'romina', 'email': 'romina@pong.fr', 'password': 'rominapong'},
            {'username': 'buseotp', 'email': 'buse@alacam.eu', 'password': 'busepong'},
            {'username': 'ahlem', 'email': 'ahlem@pong.fr', 'password': 'ahlempong'},
            {'username': 'asma', 'email': 'asma@pong.fr', 'password': 'asmapong'},
            {'username': 'barbara', 'email': 'barbara@pong.fr', 'password': 'barbarapong'},
            {'username': 'charlieping', 'email': 'charlieping@pong.fr', 'password': 'pingpong!'},
            {'username': 'drew', 'email': 'drew@pong.fr', 'password': 'drewpong'},
            {'username': 'eya', 'email': 'eya@pong.fr', 'password': 'eyapong'},
            {'username': 'fabiensql', 'email': 'fabiensql@pong.fr', 'password': 'fabdb123'},
            {'username': 'georgeapi', 'email': 'georgeapi@pong.fr', 'password': 'apisecret'},
            {'username': 'hugoweb', 'email': 'hugoweb@pong.fr', 'password': 'webhug123'},
            {'username': 'inesfull', 'email': 'inesfull@pong.fr', 'password': 'fullstack*'},
            {'username': 'julienfront', 'email': 'julienfront@pong.fr', 'password': 'frontend456'},
            {'username': 'karimback', 'email': 'karimback@pong.fr', 'password': 'backend456'},
            {'username': 'leadevops', 'email': 'leadevops@pong.fr', 'password': 'devops!'},
            {'username': 'marcvue', 'email': 'marcvue@pong.fr', 'password': 'vuejs!'},
            {'username': 'norareact', 'email': 'norareact@pong.fr', 'password': 'reactrocks'},
            {'username': 'omarnode', 'email': 'omarnode@pong.fr', 'password': 'nodeking'},
            {'username': 'quincyts', 'email': 'quincyts@pong.fr', 'password': 'typescript'},
            {'username': 'roxane', 'email': 'roxane@pong.fr', 'password': 'roxanepong'},
            {'username': 'serge', 'email': 'serge@pong.fr', 'password': 'sergepong'},
            {'username': 'roxane', 'email': 'roxane@pong.fr', 'password': 'roxanepong'},
            {'username': 'serge', 'email': 'serge@pong.fr', 'password': 'sergepong'},
            {'username': 'thomassql', 'email': 'thomassql@pong.fr', 'password': 'sqlrules'},
            {'username': 'ulyssecss', 'email': 'ulyssecss@pong.fr', 'password': 'cssmagic'},
            {'username': 'victorhtml', 'email': 'victorhtml@pong.fr', 'password': 'htmlrocks'},
            {'username': 'wendygit', 'email': 'wendygit@pong.fr', 'password': 'gitflow'},
            {'username': 'xavierci', 'email': 'xavierci@pong.fr', 'password': 'cicdpass'},
            {'username': 'yulia', 'email': 'yulia@pong.fr', 'password': 'yuliapong'},
            {'username': 'zackml', 'email': 'zackml@pong.fr', 'password': 'ml4life'},
            {'username': 'asma', 'email': 'asma@pong.fr', 'password': 'asmapong'},
            {'username': 'shinae', 'email': 'shinae@pong.fr', 'password': 'shinaepong'},
        ]

        for user_data in users:
            if not User.objects.filter(username=user_data['username']).exists():
                user = User.objects.create_user(
                    username=user_data['username'],
                    email=user_data['email'],
                    password=user_data['password']
                )
                if user_data.get('is_staff'):
                    user.is_staff = True
                if user_data.get('is_superuser'):
                    user.is_superuser = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Utilisateur créé : {user.username}"))
            else:
                self.stdout.write(f"L'utilisateur {user_data['username']} existe déjà.")
