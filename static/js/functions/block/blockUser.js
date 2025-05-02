import { getUsername } from '../utils/getUsername.js';
import { showCustomAlert } from '../utils/customAlert.js';
import { removeBlockedFriend, removeFriend } from '../notification/friend/friendList.js';

export async function blockUser(friendName) {
    // console.log('blockUser() called');
    const access = sessionStorage.getItem('access');

    try {
        const response = await fetch('/profiles/block/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access,
            },
            body: JSON.stringify({ username: friendName })  // Ensure this is correct JSON
        });

        // Check if the response is not okay (status code other than 2xx)
        if (!response.ok) {
            const errorData = await response.json();
            // console.error('Error blocking user:', errorData.error || errorData.message);
            await showCustomAlert('Error blocking user: ' + (errorData.error || errorData.message));
            return;
        }

        const data = await response.json();
        // showCustomAlert(`${friendName} has been blocked.`);
        await showCustomAlert(`${data.message}`);
        // await removeFriend(friendName);
        await removeBlockedFriend(friendName);
    } catch (error) {
        // console.error('Error blocking user:', error);
        await showCustomAlert('Error blocking user: ' + error.message);
    }
}

// i have fetcht function in this
export async function loadBlockedUsers(username) {


    // const access = sessionStorage.getItem('access');
    //const username = await getUsername();
    // console.log('loadBlockedUsers');
    
    const blockedUsersList = document.getElementById('blocked-users-list');
    
    // Clear previous list before loading new data
    blockedUsersList.innerHTML = '<li>Loading...</li>';  // Loading message
    
    try {
        const response = await fetch(`/profiles/${username}/blocked/list/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access')}`
            }
        });

        const data = await response.json();

        if (data && data.length) {
            blockedUsersList.innerHTML = '';  // Clear loading message
            data.forEach(user => {
                const userItem = document.createElement('li');
                userItem.classList.add('blocked-user-item');
                userItem.textContent = user.blocked_user.username;
                
                // Optional: Add an unblock button
                const unblockButton = document.createElement('button');
                unblockButton.textContent = 'Unblock';
                unblockButton.addEventListener('click', async () => unblockUser(user.blocked_user.username));
                
                userItem.appendChild(unblockButton);
                blockedUsersList.appendChild(userItem);
            });
        } else {
            blockedUsersList.innerHTML = '<li>No blocked users found.</li>';
        }
    } catch (error) {
        // console.error('Error loading blocked users:', error);
        blockedUsersList.innerHTML = '<li>Error loading blocked users. Please try again later.</li>';
    }
}


async function unblockUser(username) {
    const access = sessionStorage.getItem('access');

    try {
        const response = await fetch(`/profiles/unblock/${username}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access,
            }
        });

        const data = await response.json();
        if (response.ok) {
            await showCustomAlert(`${username} unblocked successfully`);
            await loadBlockedUsers(); // Refresh the list
        } else {
            await showCustomAlert("Error unblocking user: " + (data.error || "Could not unblock user"));
        }
    } catch (error) {
        // console.error("Error unblocking user:", error);
        await showCustomAlert("An error occurred while unblocking the user. Please try again.");
    }
}
