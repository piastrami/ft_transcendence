import { getUsername } from "./getUsername.js";

export async function fetchUsers() {
    // console.log('fetchUsers() from /authentication/list/');
    try {

        const response = await fetch('/authentication/list/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access')}`
            }
        });
    
        if (!response.ok) {
            throw new Error(response.statusText);
        }
    
        return await response.json();

    } catch (error) {

        throw error;
    }
}


let isLoadingUsers = false;

export async function loadUsers(users, unread, unread_from) {
    // console.log('%cisLoadingUsers before execution:', "color: magenta", isLoadingUsers);
    if (isLoadingUsers) {
        // console.log("%cloadUsers is already running. Skipping...", "color: magenta");
        return;
    }
    isLoadingUsers = true;
    // console.log('%cisLoadingUsers after execution:', "color: magenta", isLoadingUsers);


    // console.log('%cloadUsers() called', 'color: red');

    const currentUsername = await getUsername();
    const access = sessionStorage.getItem('access');

    try {
        const usersList = document.getElementById('users-list');
        const usersListInfo = document.getElementById('users-list-info');
        if (!usersList) return;

        usersList.innerHTML = '';
        usersListInfo.innerHTML = '';

        if (users.length === 0) {
            // console.log('No users found.');
            return;
        }

        const friendsResponse = await fetch(`/profiles/friends/list/${currentUsername}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access}`
            }
        });

        if (!friendsResponse.ok) {
            throw new Error('Failed to fetch friends list');
        }

        const friendsData = await friendsResponse.json();
        const friendUsernames = new Set(friendsData.map(friend =>
            friend.user1 === currentUsername ? friend.user2 : friend.user1
        ));

        const onlineResponse = await fetch('/profiles/online/users/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access}`
            }
        });

        if (!onlineResponse.ok) {
            throw new Error('Failed to fetch online users');
        }

        const onlineData = await onlineResponse.json();
        const onlineUsers = new Set(onlineData.online_users);

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
        } else {
            // console.log('Failed to fetch unread messages from API');
        }

        // console.log("%cBefore sorting my users are:", "color: green", users);
        users = [...new Set(users)];
        users.sort((a, b) => a.localeCompare(b));
        // console.log("%cAfter sorting my users are:", "color: green", users);

        // Separate online and offline users
        const onlineUsersWithUnread = users.filter(user => onlineUsers.has(user) && (unread[user] || apiUnreadData[user]) && user !== currentUsername && user !== 'admin');
        const onlineUsersWithoutUnread = users.filter(user => onlineUsers.has(user) && !(unread[user] || apiUnreadData[user]) && user !== currentUsername && user !== 'admin');
        const offlineUsersWithUnread = users.filter(user => !onlineUsers.has(user) && (unread[user] || apiUnreadData[user]) && user !== currentUsername && user !== 'admin');
        const offlineUsersWithoutUnread = users.filter(user => !onlineUsers.has(user) && !(unread[user] || apiUnreadData[user]) && user !== currentUsername && user !== 'admin');

        // Sort each list alphabetically
        onlineUsersWithUnread.sort();
        onlineUsersWithoutUnread.sort();
        offlineUsersWithUnread.sort();
        offlineUsersWithoutUnread.sort();

        // Combine: Online users with unread messages first, then offline users with unread messages, then online without unread, and offline without unread
        const sortedUsers = [
            ...onlineUsersWithUnread,
            ...offlineUsersWithUnread,
            ...onlineUsersWithoutUnread,
            ...offlineUsersWithoutUnread
        ];

        for (const user of sortedUsers) {
            if (user === "info") {
                const infoItem = document.createElement('li');
                infoItem.className = 'user-item';

                const infoMailIcon = document.createElement('span');
                if (unread_from === 'info' || apiUnreadData[user]) {
                    infoMailIcon.textContent = " 📩";
                    infoMailIcon.classList.add("infomail-icon");
                    infoMailIcon.style.color = "red";
                    infoMailIcon.style.marginLeft = "5px";
                }

                infoItem.innerHTML = `
                    <span class="user-name" data-username="info">ℹ️ Tournament Info</span>
                `;
                usersListInfo.appendChild(infoItem);
                infoItem.appendChild(infoMailIcon);
                continue;
            }

            if (user !== currentUsername && user !== 'admin' && !friendUsernames.has(user)) {
                const listItem = document.createElement('li');
                listItem.className = 'user-item';

                const statusIndicator = document.createElement('span');
                statusIndicator.style.width = '10px';
                statusIndicator.style.height = '10px';
                statusIndicator.style.borderRadius = '50%';
                statusIndicator.style.display = 'inline-block';
                statusIndicator.style.marginRight = '8px';
                statusIndicator.style.backgroundColor = onlineUsers.has(user) ? 'green' : 'red';

                listItem.appendChild(statusIndicator);

                const userNameElement = document.createElement('span');
                userNameElement.classList.add('user-name');
                userNameElement.textContent = user;
                userNameElement.dataset.username = user;
                if (user.length > 11) {
                    userNameElement.style.fontSize = '11px';
                }

                try {
                    const blockCheckResponse = await fetch(`/profiles/blocked/check/${user}/`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + access,
                        }
                    });

                    if (!blockCheckResponse.ok) {
                        // console.log(`Error checking block status for ${user}: ${blockCheckResponse.statusText}`);
                        const responseText = await blockCheckResponse.text();
                        // console.log('Response content:', responseText.substring(0, 200));
                        continue;
                    }

                    const blockStatus = await blockCheckResponse.json();
                    const isBlocked = blockStatus.is_blocked;

                    if ((unread[user] && !isBlocked) || (apiUnreadData[user] && !isBlocked)) {
                        const mailIcon = document.createElement('span');
                        mailIcon.textContent = " 📩";
                        mailIcon.classList.add("mail-icon");
                        mailIcon.style.color = "red";
                        mailIcon.style.marginLeft = "5px";
                        userNameElement.appendChild(mailIcon);
                    }

                    listItem.appendChild(userNameElement);

                    listItem.innerHTML += `
                        <div class="user-actions">
                            <button class="btn-view-profile" data-username="${user}">
                                <i class="fa-solid fa-user"></i>
                            </button>
                            <button class="btn-add-friend" data-username="${user}">
                                <i class="fa fa-user-plus"></i>
                            </button>
                        </div>
                    `;

                    usersList.appendChild(listItem);

                    // Fix for icons not being clickable
                    listItem.querySelectorAll('.btn-view-profile i, .btn-add-friend i').forEach(icon => {
                        icon.addEventListener('click', function (e) {
                            this.parentElement.click();
                            e.stopPropagation();
                        });
                    });

                } catch (error) {
                    // console.log(`Error processing user ${user}:`, error);
                }
            }
        }
    } catch (error) {
        // console.log('Error fetching users:', error);
    } finally {
        isLoadingUsers = false;
        // console.log('%cisLoadingUserss finaly:', "color: magenta", isLoadingUsers);

    }
}

