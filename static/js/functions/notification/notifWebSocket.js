import { getIp } from '../game/getIp.js';
import { showCustomAlert } from '../utils/customAlert.js';
import { handleInviteNotifResponse } from './utils/utils.js';
import { loadNotifications } from '../navbar/loadNotifications.js';
import { MainChatWindow } from '../chat/mainChatWindow.js';


class NotificationWebSocketManager {
    constructor() {
        this.socket = null;
        this.ip = null;
        this.wsUrl = '';
        this.queue = [];
        this.isShowing = false;
    }

    async setup() {
        this.ip = await getIp();
        this.access_token = sessionStorage.getItem('access');
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        this.wsUrl = `${protocol}${this.ip}:8001/ws/notifications/?token=${this.access_token}`;
    }

    async connect() {
        if (!this.ip) {
            await this.setup();
        }

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)){
           // console.log('WebSocket.OPEN in connect', 'color: red');
            return;
        }
        this.socket = new WebSocket(this.wsUrl);
        // console.log('%ccreate new inst of notifwebsocket', 'color: red');
        
        this.socket.onopen = () => {}; // console.log(this.getSocketStatus(), 'color: green');
        this.socket.onmessage = (event) => this.handleNotification(JSON.parse(event.data));
        this.socket.onclose = () => {}; // console.log(this.getSocketStatus(), 'color: red');
        this.socket.onerror = {}; //(error) => console.log("WebSocket error:", error);
    }

    getSocket() {
        return this.socket;
    }

    closeSocket() {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            this.socket.close();
        }
    }

    getSocketStatus() {
        if (!this.socket) return "%cNo notif WebSocket connection established.";
        return ["%cCONNECTING NOTIF WEBSOCKET...", "%cNOTIF WEBSOCKET OPEN", "%cCLOSING NOTIF WEBSOCKET...", "%cNOTIF WEBSOCKET CLOSED"][this.socket.readyState] || "%cUNKNOWN STATE IN NOTIF WEBSOCKET";
    }

    async handleNotification(data) {
        // console.log('NotificationWebSocketManager Class:Received data in handleNotification():', data);
        this.queue.push(data);
        if (!this.isShowing) {
            this.showNextNotification();
        }
    }

    async showNextNotification() {
        if (this.queue.length === 0) {
            loadNotifications();
            this.isShowing = false;
            return;
        }

        this.isShowing = true;
        const data = this.queue.shift();

        switch (data.type) {
            case 'friend_request_notif':
                await this.showFriendRequestNotification(data);
                break;
            case 'friend_request_response':
                await this.showFriendRequestResponse(data);
                break;
            case 'game_invite_notif':
                await this.showGameInviteNotification(data);
                break;
            case 'online':
                await this.reloadStatus();
                break;
            case 'unread_msg':
                await this.unreadMsg(data);
                break;
            // case 'read_msg':
            //     await this.readMsg(data);
            //     break;
            case 'update_game_notif':
                loadNotifications();
                break;
            default:
                await showCustomAlert(data.error);
        }
        
        this.showNextNotification();
    }

    async unreadMsg(data) {
        // console.log('%cNotificationWebSocketManager Class=> data_type:unread_msg', 'color: red');
        // console.log(`NotificationWebSocketManager Class=> New unread message from: ${data.sender}`);
        //update manually
        if (MainChatWindow.instance) {
            // console.log('NotificationWebSocketManager Class=> call updateFriendsAndUsers()');
            MainChatWindow.instance.unread[data.sender] = true;
            MainChatWindow.instance.unread_from = data.sender;
            MainChatWindow.instance.updateFriendsAndUsers();
        }

    }
    

    async reloadStatus()
    {
        // console.log('%cNotificationWebSocketManager Class=> data_type:online', 'color: red');
        if (MainChatWindow.instance) {
            // console.log('%ccall updateFriendsAndUsers() from notif', 'color: red');
            MainChatWindow.instance.updateFriendsAndUsers();
        }
    }

    // async reloadStatus()
    // {
    //     console.log('%cNotificationWebSocketManager Class=> data_type:online', 'color: red');

    //     const tryUpdate = () => {
    //         if (MainChatWindow.instance) {
    //             console.log('%ccall updateFriendsAndUsers() from notif', 'color: red');
    //             MainChatWindow.instance.updateFriendsAndUsers();
    //         } else {
    //             console.log("MainChatWindow not ready, retrying reloadStatus in 100ms...");
    //             setTimeout(tryUpdate, 100);
    //         }
    //     };
    
    //     tryUpdate();

    // }

    async showFriendRequestNotification(data) {
        // console.log('%cshowFriendRequestNotification()', 'color: Yellow');
        // console.log('NotificationWebSocketManager Class=> data-type:friend_request_notif');
        return new Promise((resolve) => {
            const notificationPopup = document.createElement('div');
            notificationPopup.classList.add('notification-popup');
            notificationPopup.innerHTML = `
                <p>${data.message}</p>
                <button id="accept-btn">Accept</button>
                <button id="reject-btn">Reject</button>
            `;
            document.body.appendChild(notificationPopup);

            const acceptButton = document.getElementById('accept-btn');
            if (acceptButton) {
                acceptButton.addEventListener('click', () => {
                    // console.log("%caccept friend request", 'color: Yellow');
                    this.sendResponseToFriendRequest(data.sender, 'accept');
                    notificationPopup.remove();
                    resolve();
                });
            }

            const rejectButton = document.getElementById('reject-btn');
            if (rejectButton) {
                rejectButton.addEventListener('click', () => {
                    // console.log("%creject friend request", 'color: Yellow');
                    this.sendResponseToFriendRequest(data.sender, 'reject');
                    notificationPopup.remove();
                    resolve();
                });
            }

            setTimeout(() => {
                if (document.body.contains(notificationPopup)) {
                    notificationPopup.remove();
                    resolve();
                }
            }, 10000);

            
        });
    }

    async creatFriendRequest(receiverId) {
        // console.log('NotificationWebSocketManager Class=> creatFriendRequest()');
        try {
            const accessToken = sessionStorage.getItem('access');
            const response = await fetch(`/notifications/friend-requests/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ receiver: receiverId })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                // console.log('Error sending friend request:', errorData);
            } else {
                const data = await response.json();
                // console.log('Friend request sent successfully:', data);
            }
        } catch (error) {
            // console.log('Network or server error:', error);
        }
    }
    
    async sendResponseToFriendRequest(friendName, response) {
        // console.log('NotificationWebSocketManager Class=> sendResponseToFriendRequest()');
        this.socket.send(JSON.stringify({
            type: 'friend_request_response',
            friend_name: friendName,
            response: response,
        }));

        //update manually
        if (MainChatWindow.instance) {
            // console.log('%cNotificationWebSocketManager Class=> call updateFriendsAndUsers()', 'color: red');
            MainChatWindow.instance.updateFriendsAndUsers();
        }
    }


    async showFriendRequestResponse(data) {
        // console.log('NotificationWebSocketManager Class=> data_type:friend_request_response');
        if (MainChatWindow.instance) {
            // console.log('%cupdate manually Open the chat popover (using the existing instance of MainChatWindow)', 'color: red');

            MainChatWindow.instance.updateFriendsAndUsers();
        }
        // return new Promise((resolve) => {
        //     if (data.message){

        //         const notificationPopup = document.createElement('div');
        //         notificationPopup.classList.add('notification-popup');
        //         notificationPopup.innerHTML = `<p>${data.message}</p><button class="ok-button">OK</button>`;
        //         document.body.appendChild(notificationPopup);
    
        //         document.querySelector('.ok-button').addEventListener('click', () => {
        //             notificationPopup.remove();
        //             resolve();
        //         });
    
        //         setTimeout(() => {
        //             notificationPopup.remove();
        //             resolve();
        //         }, 10000);
        //     }
           
        //     });
    }



    async showGameInviteNotification(data) {
        // console.log('NotificationWebSocketManager Class=> data-type:game_invite_notif');
        // console.log(`NotificationWebSocketManager Class=> gme type: ${data.game_type}`);
    
            
        // create GameRequestNotif in frontend for updating notif after timeout
        try {
            const token = sessionStorage.getItem('access');

            const response = await fetch('/notifications/game-request-notif/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    recipient_username: data.receiver,
                    game_type: data.game_type,
                    game_id: data.game_id,
                    message: data.message,
                    status: data.request_status,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                // console.warn('Game request not created:', errorData);
                return; // exit early if there was an error
            } else {
                // console.log('Game request created successfully');
            }
        } catch (error) {
            // console.error('Error creating game request:', error);
            return; // exit early if there's an exception
        }

        
        return new Promise((resolve) => {
            if (data.request_status !== 'pending') return resolve();

            const notificationPopup = document.createElement('div');
            notificationPopup.classList.add('notification-popup');
            notificationPopup.innerHTML = `
                <p>${data.message}</p>
                <a href="/${data.game_type}/${data.game_id}" style="display:none; color:blue; text-decoration:underline;">(Join Game)</a>
                <div>
                    <button id="accept-btn">Accept</button>
                    <button id="reject-btn">Reject</button>
                </div>
            `;
            document.body.appendChild(notificationPopup);
            const gameLink = notificationPopup.querySelector('a');

            document.getElementById('accept-btn').addEventListener('click', async () => {
                gameLink.style.display = 'block';
                await handleInviteNotifResponse(data.game_id, data.game_type, 'accepted');
                resolve();
            });

            document.getElementById('reject-btn').addEventListener('click', async () => {
                await handleInviteNotifResponse(data.game_id, data.game_type, 'rejected');
                notificationPopup.remove();
                resolve();
            });

            setTimeout(() => {
                notificationPopup.remove();
                resolve();
            }, 10000);
        });
    }
}

const notifWebSocket = new NotificationWebSocketManager();
export default notifWebSocket;
