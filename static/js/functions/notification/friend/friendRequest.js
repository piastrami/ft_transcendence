import { getUsername } from '../../utils/getUsername.js';
import notifWebSocket from '../notifWebSocket.js';
import { showCustomAlert } from '../../utils/customAlert.js';


export async function friendRequest(friendName) {
    // console.log(`friendRequest() called=> Sending friend request to: ${friendName}`);
    const access = sessionStorage.getItem(`access`);
    const username = await getUsername();

    //DEBUGGING================
    // console.log('access in FriendRequest(): ', access);
    // console.log('username in FriendRequest():', username);
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
            //     // console.log('No blocked users found.');
            // }

            // console.log('Blocked users FriendRequest():', blockedUsers);
            const isBlocked = blockedUsers.some(user => user.blocked_user.username === friendName);
            // console.log('isBlocked FriendRequest():', isBlocked);

            if (isBlocked) {
                // console.log(`${friendName} is in your block list. Cannot send friend request.`);
                await showCustomAlert(`${friendName} is in your block list. Cannot send friend request.`);
                return;
            }
        
            // Get WebSocket from NotificationWebSocketManager and send the message
            const socket = notifWebSocket.getSocket();
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                // console.log(notifWebSocket.getSocketStatus(), 'color: red');
                // console.log('notifWebSocket is not open, queuing message');
                return;
            } 
            // else {
            //     // console.log('notifWebSocket is open.');
            //     console.log(notifWebSocket.getSocketStatus(), 'color: green');
                
            // }

            if (socket && socket.readyState === WebSocket.OPEN) {
                // console.log('send friend_request message from FriendRequest() to backend( Notifconsumer)');
                socket.send(JSON.stringify({
                    'type': 'friend_request',
                    'friend_name': friendName,
                }));
                await showCustomAlert(`Friend request sent to ${friendName}`);
                // console.log(`Friend request sent to ${friendName}`);
            } else {
                // console.log('WebSocket connection is not open');
                // console.log(notifWebSocket.getSocketStatus(), 'color: red');
            }

        } else {
            // console.log('No access token found.');
        }    
    } catch (error) {
        // console.log('Error sending friend request:', error);
    }
}
