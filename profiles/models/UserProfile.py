from django.db import models
from authentication.models.User import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE) 
    avatar=models.ImageField(upload_to='avatars/', default='avatars/default.jpg')
    friends = models.ManyToManyField("self", blank=True, symmetrical=True)
    # symmetrical=False : Permet de gérer les demandes d’amitié. Par défaut, une relation ManyTo-Many est symétrique (si A est ami avec B, alors B est automatiquement ami avec A). En mettant symmetrical=False, on pourra gérer les demandes d’amitié de façon plus fine.
    
    # only for OAuth users
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    oauth_with_customed_avatar = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"Profil de {self.user.username}"
    