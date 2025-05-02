import { getUsername } from '../../utils/getUsername.js';
import notifWebSocket from '../notifWebSocket.js';
import { showCustomAlert } from '../../utils/customAlert.js';

export async function gameNotif(gameId, friendName, game_type) {
    // console.log(`gameNotif() called=> Sending game invite to: ${friendName}`);
    const access = sessionStorage.getItem(`access`);
    const username = await getUsername();

    //DEBUGGING================
    // console.log('access in sendFriendRequest(): ', access);
    // console.log('username in sendFriendRequest():', username);
    //================DEBUGGING

    try {
        if (access) {
            // **Check if the friend is blocked before sending the message**
            const blockCheckResponse = await fetch(`/profiles/${username}/blocked/list/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + access,
                }
            });
    
            if (!blockCheckResponse.ok) {
                // console.log('Error fetching blocked users:', await blockCheckResponse.json());
                return;
            }

            const blockedUsers = await blockCheckResponse.json();
            
            // if (blockedUsers.length === 0) {
            //     console.log('No blocked users found.');
            // }

            // console.log('Blocked users in gameNotif():', blockedUsers);
            const isBlocked = blockedUsers.some(user => user.blocked_user.username === friendName);
            // console.log('isBlocked in gameNotif():', isBlocked);

            if (isBlocked) {
                // console.log(`${friendName} is in your block list. Cannot send friend request.`);
                await showCustomAlert(`${friendName} is in your block list. Cannot send friend request.`);
                return;
            }
        
            // Get WebSocket from NotificationWebSocketManager and send the message
            const socket = notifWebSocket.getSocket();
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                // console.log('notifWebSocket is not open, queuing message');
                // console.log(notifWebSocket.getSocketStatus(), 'color: red');
                return;
            } else {
                // console.log('notifWebSocket is open.');
                // console.log(notifWebSocket.getSocketStatus(), 'color: green');
            }

            if (socket && socket.readyState === WebSocket.OPEN) {
                // console.log('send message from gameNotif() to backend(Notifconsumer)');
                socket.send(JSON.stringify({
                    'type': 'game_request',
                    'friend_name': friendName,
                    'game_type': game_type,
                    'game_id': gameId,
                }));
                // console.log(`game request sent to ${friendName}`);
            } else {
                // console.log(notifWebSocket.getSocketStatus(), 'color: red');
            }

        } else {
            // console.log('No access token found.');
        }    
    } catch (error) {
        // console.log('Error sending game request:', error);
    }
}
