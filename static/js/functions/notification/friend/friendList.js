import { getUsername } from '../../utils/getUsername.js';
import { showCustomAlert } from '../../utils/customAlert.js';
import { IndividualChatWindow } from "../../chat/individualChatWindow.js";
import { navigateTo } from "../../../index.js";
import { MainChatWindow } from '../../chat/mainChatWindow.js';


export async function fetchFriends() {
    // console.log("fetchFriends() called");
    const username = await getUsername();
    
    try {
        // Fetch friends list
        const response = await fetch(`/profiles/friends/list/${username}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('access'),
            }
        });
        
        return await response.json();
        
    }
    catch (error) {
        
        throw error;
    }
}

let isLoadingFriends = false;

export async function loadFriends(friendsData, unread, unread_from) {
    // console.log('%cisLoadingFriends before execution:', "color: magenta", isLoadingFriends);

    if (isLoadingFriends) {
        // console.log("%cloadFriends is already running. Skipping...", "color: magenta");
        return;
    }
    isLoadingFriends = true;
    // console.log('%cisLoadingFriends after execution:', "color: magenta", isLoadingFriends);


    try {
        const username = await getUsername();
        const access = sessionStorage.getItem('access');

        const friendUsersList = document.getElementById('friends-list');
        if (!friendUsersList) {
            // console.log('Error: #friends-list not found in the DOM.');
            return;
        }

        friendUsersList.innerHTML = '<li>Loading...</li>';

        const onlineResponse = await fetch(`/profiles/online/users/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access,
            }
        });

        const onlineData = await onlineResponse.json();
        const onlineFriends = new Set(onlineData.online_users);

        const unreadResponse = await fetch('/chat/check-unread-messages/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access}`
            }
        });

        let apiUnreadData = {};
        if (unreadResponse.ok) {
            apiUnreadData = await unreadResponse.json();
            // console.log('API unread messages data in loadfriends:', apiUnreadData);
        }

        if (friendsData && friendsData.length) {
            friendUsersList.innerHTML = '';
            
            const sortedFriends = [...friendsData].sort((a, b) => {
                const getFriendUsername = (friend) => friend.user1 === username ? friend.user2 : friend.user1;
                
                const friendA = getFriendUsername(a);
                const friendB = getFriendUsername(b);
            
                const isOnlineA = onlineFriends.has(friendA);
                const isOnlineB = onlineFriends.has(friendB);
            
                const hasUnreadA = (unread[unread_from] && friendA === unread_from) || apiUnreadData[friendA];
                const hasUnreadB = (unread[unread_from] && friendB === unread_from) || apiUnreadData[friendB];
            
                // Assign score based on conditions
                const score = (isOnline, hasUnread) => {
                    if (isOnline && hasUnread) return 3;
                    if (isOnline && !hasUnread) return 2;
                    if (!isOnline && hasUnread) return 1;
                    return 0;
                };
            
                const scoreA = score(isOnlineA, hasUnreadA);
                const scoreB = score(isOnlineB, hasUnreadB);
            
                if (scoreA !== scoreB) return scoreB - scoreA; // Sort by score descending
                return friendA.localeCompare(friendB); // Alphabetical fallback
            });
            

            for (let friend of sortedFriends) {
                try {
                    let friendUsername = friend.user1 === username ? friend.user2 : friend.user1;

                    const userItem = document.createElement('li');
                    userItem.classList.add('friend-user-item');

                    const statusIndicator = document.createElement('span');
                    statusIndicator.style.width = '10px';
                    statusIndicator.style.height = '10px';
                    statusIndicator.style.borderRadius = '50%';
                    statusIndicator.style.display = 'inline-block';
                    statusIndicator.style.marginRight = '8px';
                    statusIndicator.style.backgroundColor = onlineFriends.has(friendUsername) ? 'green' : 'red';

                    const userNameSpan = document.createElement('span');
                    userNameSpan.classList.add('user-name');
                    userNameSpan.textContent = friendUsername;
                    userNameSpan.dataset.username = friendUsername;
                    if (friendUsername.length > 11) {
                        userNameSpan.style.fontSize = '11px';
                    }

                    userNameSpan.addEventListener('click', async () => {
                        const currentUsername = await getUsername();
                        const individualChatWindow = new IndividualChatWindow(currentUsername, friendUsername);
                        await individualChatWindow.init();
                        if (MainChatWindow.instance) {
                            MainChatWindow.instance.removeMailIcon(friendUsername);
                        }
                    });

                    userItem.appendChild(statusIndicator);
                    userItem.appendChild(userNameSpan);

                    const blockCheckResponse = await fetch(`/profiles/blocked/check/${friendUsername}/`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + access,
                        }
                    });

                    if (!blockCheckResponse.ok) {
                        const responseText = await blockCheckResponse.text();
                        // console.log('Block check error response:', responseText.substring(0, 200));
                        continue;
                    }

                    const blockStatus = await blockCheckResponse.json();
                    const isBlocked = blockStatus.is_blocked;

                    if ((unread[unread_from] && friendUsername === unread_from && !isBlocked) || (apiUnreadData[friendUsername] && !isBlocked)) {
                        const mailIcon = document.createElement('span');
                        mailIcon.textContent = " \ud83d\udce9";
                        mailIcon.classList.add("mail-icon");
                        mailIcon.style.color = "red";
                        mailIcon.style.marginLeft = "5px";
                        userNameSpan.appendChild(mailIcon);
                    }

                    const viewProfileButton = document.createElement('button');
                    const profileIcon = document.createElement('i');
                    profileIcon.classList.add('fa-solid', 'fa-user');
                    viewProfileButton.appendChild(profileIcon);
                    viewProfileButton.classList.add('btn-view-profile');
                    viewProfileButton.addEventListener('click', () => navigateTo(`/profile/${friendUsername}`));

                    const removeFriendButton = document.createElement('button');
                    const removeIcon = document.createElement('i');
                    removeIcon.classList.add('fa-solid', 'fa-user-minus');
                    removeFriendButton.appendChild(removeIcon);
                    removeFriendButton.style.backgroundColor = 'red';
                    removeFriendButton.style.color = 'white';
                    removeFriendButton.addEventListener('click', async () => removeFriend(friendUsername));

                    const actionsDiv = document.createElement('div');
                    actionsDiv.classList.add('user-actions');
                    actionsDiv.appendChild(viewProfileButton);
                    actionsDiv.appendChild(removeFriendButton);

                    userItem.appendChild(actionsDiv);
                    friendUsersList.appendChild(userItem);
                } catch (error) {
                    // console.log('Error processing friend:', error);
                }
            }
        } else {
            friendUsersList.innerHTML = '<li>No friends found.</li>';
        }
    } catch (error) {
        // console.log('Error loading friends list:', error);
        const friendUsersList = document.getElementById('friends-list');
        if (friendUsersList) {
            friendUsersList.innerHTML = '<li>Error loading friends list. Please try again later.</li>';
        }
    } finally {
        isLoadingFriends = false;
        // console.log('%cisLoadingFriends finaly:', "color: magenta", isLoadingFriends);
    }
}

export async function removeFriend(username) {
    const access = sessionStorage.getItem('access');
    // console.log("friendname in removeFriend:", username);

    try {
        const response = await fetch(`/profiles/remove-friend/${username}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access,
            }
        });
        // console.log("response for removing a friend in removeFriend():", response);
        const data = await response.json();
        if (!response) {
            // console.log("Error removing user from friend list: " + (data.error || "Could not remove user from friend list"));

        }
        // if (response.ok) {
        //     await showCustomAlert(`${username} removed successfully from friends list`);
        //     loadFriends(); // Refresh the list

        // } else {
        //     // await showCustomAlert("Error removing user from friend list: " + (data.error || "Could not remove user from friend list"));
        //     console.log("Error removing user from friend list: " + (data.error || "Could not remove user from friend list"));

        // }
    } catch (error) {
        // console.log("Error removing user from friend list:", error);
        await showCustomAlert("An error occurred while removing user from friend list. Please try again.");
    }
}


export async function removeBlockedFriend(username) {
    // console.log("removeBlockedFriend()=> friendname:", username);    
    const access = sessionStorage.getItem('access');

    try {
        const response = await fetch(`/profiles/remove-blocked-friend/${username}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access,
            }
        });
        // console.log("response for removing a friend in removeBlockedFriend():", response);

        const data = await response.json();

        if (response.ok) {
            // Check if the response contains a message
            if (data.message === "User is not in the friendship list") {
                // console.log("User is not in the friendship list.");
            } else {
                // await showCustomAlert(`${username} removed successfully from friends list`);
                // console.log(`${username} removed successfully from friends list`);
                // await loadFriends(); // ? because block list is in settings
            }
        } else {
            // console.log("Error removing user from friend list:", data.error || "Unknown error");
        }
    } catch (error) {
        // console.log("Error removing user from friend list:", error);
        // await showCustomAlert("An error occurred while removing user from friend list. Please try again.");
    }
}

