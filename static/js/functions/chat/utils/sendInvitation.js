import webSocketManager from '../websocketManager.js';

export async function sendInvitation(roomID, gameId, roomName, friendName, username, message, messageType, game_type) {
    const access = sessionStorage.getItem(`access`);
    
    //DEBUGGING================
    // console.log('access in sendInvitation(): ', access);
    // console.log('roomName in sendInvitation() before try:', roomName);
    // console.log('username in sendInvitation():', username);
    // console.log('roomID in sendInvitation():', roomID);
   // console.log('gameID in sendInvitation():', gameId);

    //================DEBUGGING

    const chatSocket = webSocketManager.getSocket();
    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        // console.log('WebSocket is not open, queuing message');
        // console.log(webSocketManager.getSocketStatus(), 'color: red');
        return;
    } else {
        // console.log('WebSocket is open.');
        // console.log(webSocketManager.getSocketStatus(), 'color: green');
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
            // console.log('Blocked users sendInvitation():', blockedUsers);
            const isBlocked = blockedUsers.some(user => user.blocked_user.username === friendName);
            // console.log('isBlocked sendInvitation():', isBlocked);

            if (isBlocked && messageType === 'game_request') {
                // console.log('Blocked user in sendInvitation() for game:', friendName);
                await showCustomAlert(`${friendName} is in your block list. Cannot send invitation.`);
                return;
            }
            
            // i have to check when she wants to create an instance 
            // await createGameInstance(gameId, friendName, username);

            // **Proceed with sending the message if not blocked**
            chatSocket.send(JSON.stringify({
                'type': messageType,
                'username': username,
                'message': message,
                'friendName': friendName,
                'game_type': game_type,
                'gameId': gameId,
            }));

            // console.log('roomName in sendInvitation() after try:', roomName);
            // console.log('messageType in sendInvitation() after try:', messageType);
        } else {
            // console.log('Access token not found');
        }
    } catch (error) {
        // console.log('Error sending message:', error);
        // console.log('Error sending message:', error);
    }
}