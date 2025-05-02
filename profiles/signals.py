from django.db.models.signals import post_save, post_delete
from profiles.models.UserProfile import UserProfile
from profiles.models.FriendShip import Friendship
from authentication.models.User import User
from django.dispatch import receiver

# create a UserProfile when a new User is created, except for admin and info Users
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a UserProfile when a new User is created"""
    if created and instance.username != 'admin' and instance.username != 'info':
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save the UserProfile when the User is saved"""
    if hasattr(instance, 'userprofile') and instance.username != 'admin' and instance.username != 'info':
        instance.userprofile.save()

# Update friends in UserProfile when a Friendship is created or deleted
@receiver(post_save, sender=Friendship)
def update_user_profiles_on_friendship_created(sender, instance, created, **kwargs):
    """
    Signal qui s'exécute après la création d'une amitié.
    Met à jour les relations ManyToMany dans UserProfile.
    """
    if created:  
        profile1 = UserProfile.objects.get(user=instance.user1)
        profile2 = UserProfile.objects.get(user=instance.user2)
        
        profile1.friends.add(profile2)
        profile2.friends.add(profile1)

# Delete friends in UserProfile when a Friendship is deleted
@receiver(post_delete, sender=Friendship)
def update_user_profiles_on_friendship_deleted(sender, instance, **kwargs):
    """
    Signal qui s'exécute après la suppression d'une amitié.
    Supprime les relations ManyToMany dans UserProfile.
    """
    try:
        profile1 = UserProfile.objects.get(user=instance.user1)
        profile2 = UserProfile.objects.get(user=instance.user2)
        
        profile1.friends.remove(profile2)
        profile2.friends.remove(profile1)
    except UserProfile.DoesNotExist:
        pass
