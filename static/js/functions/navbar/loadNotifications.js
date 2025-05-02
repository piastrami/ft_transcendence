import { getUsername } from '../utils/getUsername.js';
import { sendResponseToFriendRequest } from './sendResponseToFriendRequest.js';
import { sendResponseToGameRequest } from './sendResponseToGameRequest.js';
import { updateNotificationCount } from './updateNotificationCount.js';
import { navigateTo } from '../../index.js';

export async function loadNotifications() {
    // console.log('loadNotifications()');
    const access = sessionStorage.getItem('access');
    try {
        const currentUser = await getUsername();
        // console.log('access in printnavbar after try:', access);

        // Fetch friend notifications
        const friendResponse = await fetch(`/notifications/friend-request/`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${access}`,
            },
        });
        const friendNotifications = await friendResponse.json();
        // console.log('friend notifications:', friendNotifications);

        
        // Fetch game notifications
        const gameResponse = await fetch(`/notifications/game-request-notif/list/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access}`,
                
            }
        });
        const gameNotifications = await gameResponse.json();

        // console.log('game notifications:', gameNotifications);

        // Helper function to format the created_at date
        function formatDate(dateString) {
            const date = new Date(dateString);
            if (isNaN(date)) {
                // console.log('Invalid Date:', dateString);
                return 'Invalid date format';
            }
            return date.toLocaleString('en-US', { 
                hour: 'numeric', 
                minute: 'numeric', 
                second: 'numeric', 
                hour12: true,
                timeZone: 'Europe/Paris'
            });
        }

        const notificationList = document.getElementById('notificationList');
        if (!notificationList) {
            return;
        }
        notificationList.innerHTML = ''; // Clear previous notifications

        // Process friend notifications
        const userFriendNotifications = friendNotifications.filter(n => n.receiver === currentUser);
        userFriendNotifications.forEach(notification => {
            const item = document.createElement('li');
            const notificationTime = formatDate(notification.timestamp || 'No date'); 
            // console.log("notif timestamp : ",notification.timestamp);

            item.className = 'dropdown-item';
            item.innerHTML = `
                <p>${notification.message}</p>
                <button class="btn btn-success btn-sm" id="accept-btn-${notification.id}">Accept</button>
                <button class="btn btn-danger btn-sm" id="reject-btn-${notification.id}">Reject</button>
                <p><small>${notificationTime}</small></p>
            `;
            notificationList.appendChild(item);

            const acceptButtonNotif = document.getElementById(`accept-btn-${notification.id}`);
            if (acceptButtonNotif) {
                acceptButtonNotif.addEventListener('click', async () => {
                    await sendResponseToFriendRequest(notification.id, 'accept');
                    item.remove();
                    updateNotificationCount();
                });
            }
            const rejectButtonNotif = document.getElementById(`reject-btn-${notification.id}`);
            if (rejectButtonNotif) {
                rejectButtonNotif.addEventListener('click', async () => {
                    await sendResponseToFriendRequest(notification.id, 'reject');
                    item.remove();
                    updateNotificationCount();
                });
            }
        });

        // Process game notifications
        gameNotifications.forEach(notification => {
            const item = document.createElement('li');
            const notificationTime = formatDate(notification.created_at); 
            item.className = 'dropdown-item';
            let buttons = '';
            let gameLink = '';
        
            if (notification.status === 'pending') {
                buttons = `
                    <button class="btn btn-success btn-sm" id="accept-game-btn-${notification.id}">Accept</button>
                    <button class="btn btn-danger btn-sm" id="reject-game-btn-${notification.id}">Reject</button>
                `;
            } else if (notification.status === 'accepted') {
                // console.log("accepted");
                
                gameLink = `
                    <span id="game-link-${notification.id}" style="display: block; text-decoration: underline; cursor: pointer; color: blue;">
                        Join Game
                    </span>
                `;
                buttons = `
                    <button class="btn btn-secondary btn-sm">Accepted</button>
                    <button class="btn btn-danger btn-sm" id="reject-game-btn-${notification.id}">Reject</button>
                `;
            } else if (notification.status === 'rejected') {
                buttons = `
                    <button class="btn btn-success btn-sm" id="accept-game-btn-${notification.id}">Accept</button>
                    <button class="btn btn-secondary btn-sm">Rejected</button>
                `;
            }
        
            // Append the message, game link, and buttons
            item.innerHTML = `<p>${notification.message}</p>${gameLink}${buttons}<small>${notificationTime}</small>`;
            notificationList.appendChild(item);
        
            // Add event listeners for Accept/Reject buttons
            if (notification.status === 'pending' || notification.status === 'rejected') {
                const acceptGameButtonNotif = document.getElementById(`accept-game-btn-${notification.id}`);
                if (acceptGameButtonNotif) {
                    acceptGameButtonNotif.addEventListener('click', async () => {
                        await sendResponseToGameRequest(notification.game_id, notification.game_type, notification.message, 'accepted', item);
                    });
                }
            }
            if (notification.status === 'pending' || notification.status === 'accepted') {
                const rejectGameButtonNotif = document.getElementById(`reject-game-btn-${notification.id}`);
                if (rejectGameButtonNotif) {
                    rejectGameButtonNotif.addEventListener('click', async () => {
                        await sendResponseToGameRequest(notification.game_id, notification.game_type, notification.message,'rejected', item);
                    });
                }
            }
        
            // Add event listener for "Join Game" link
            if (notification.status === 'accepted') {
                const gameLinkElement = document.getElementById(`game-link-${notification.id}`);
                // gameLinkElement.addEventListener('click', () => {
                //     window.location.href = `/${notification.game_type}/${notification.game_id}`;
                // });
                if (gameLinkElement) {
                    gameLinkElement.addEventListener('click', (event) => {
                        event.preventDefault();  // Prevent full page reload
                        navigateTo(`/${notification.game_type}/${notification.game_id}`);  // Use your custom SPA routing function
                    });
                }
                //By using event.preventDefault() you ensure that even if the element behaves like a link (like using href), it won't trigger a full reload. Instead, navigateTo() handles the route internally, keeping the page intact.
            }
        });
        
        // Update notification badge count
        const totalNotifications = userFriendNotifications.length + gameNotifications.length;
        document.getElementById('notificationCount').textContent = totalNotifications;
    } catch (error) {
        // console.log('Error loading notifications:', error);
    }
}
