import webSocketManager from '../websocketManager.js';
import { createGameInstance } from '../../game/createGameInstance.js';
import { showCustomAlert } from '../../utils/customAlert.js';


export async function sendMessage(roomID, roomName, friendName, username, message, messageType, game_type) {
    const access = sessionStorage.getItem(`access`);

    //DEBUGGING================
    // console.log('access in sendMessage(): ', access);
    // console.log('roomName in sendMessage() before try:', roomName);
    // console.log('username in sendMessage():', username);
    // console.log('roomID in sendMessage():', roomID);
    //================DEBUGGING

    const chatSocket = webSocketManager.getSocket();
    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        // console.log(webSocketManager.getSocketStatus());
        
        // console.log('WebSocket is not open');
        return;
    } else {
        // console.log('WebSocket is open.');
        // console.log(webSocketManager.getSocketStatus());
    }

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
                // console.log('Error fetching blocked users:', await blockCheckResponse.json());

                return;
            }

            const blockedUsers = await blockCheckResponse.json();
            
            // ////////////const blockedUsers = await getBlockList.json();

            // console.log('Blocked users sendmessage():', blockedUsers);
            const isBlocked = blockedUsers.some(user => user.blocked_user.username === friendName);
            // console.log('isBlocked sendmessage():', isBlocked);

            if (isBlocked && messageType === 'game_request') {
                await showCustomAlert(`${friendName} is in your block list. Cannot send invitation.`);
                return;
            }

            // **Proceed with sending the message if not blocked**
            chatSocket.send(JSON.stringify({
                'type': messageType,
                'game_type': game_type,
                'username': username,
                'message': message,
                'friendName': friendName,
                'game_type': game_type,
            }));

        } else {
            // console.log('Access token not found');
        }
    } catch (error) {
        // console.log('Error sending message:', error);
        // console.log('Error sending message:', error);

    }
}


