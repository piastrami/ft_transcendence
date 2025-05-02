import { blockUser } from '../../block/blockUser.js';
import { getUsername } from '../../utils/getUsername.js';
import { getMsgs } from './getMsgs.js';
import { showCustomAlert } from '../../utils/customAlert.js';
import { navigateTo } from '../../../index.js';

let access = null;

export async function loadOldMessages(roomName, friendName, roomID) {

    // console.log('loadOldMessages()');
    
    access = sessionStorage.getItem(`access`);

    const chatLog = document.getElementById(`chat-log-${roomName}`);
    if (!chatLog) 
        return;
    
    try {

        const messages = await getMsgs(roomName);

        const currentUsername = await getUsername();
        
        // DEBUG===========
        // console.log('Messages loaded from DB:', messages);
        //===========DEBUG

        // Mark messages from the other user as read
        if (friendName) {
            await markMessagesAsRead(roomName);
        }


        chatLog.innerHTML = ""; // Clear existing messages

        // Sort messages by timestamp first
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // console.log('%cloadMesg()game_id in message.db :', 'color: Yellow', messages[0].game_id);
        
        // Then move pending requests to the end
        // messages.sort((a, b) => ((a.request_status === 'pending' && a.game_id !== null )? 1 : (b.request_status === 'pending' && b.game_id !== null) ? -1 : 0));


        for (const message of messages) {
            let formattedUsername = message.username.charAt(0).toUpperCase() + message.username.slice(1);
        
            if (message.message_type === 'message') {
                messageAppend(message, chatLog, currentUsername, formattedUsername);
            } else if (message.message_type === 'game_request') {
                if (message.username === currentUsername && message.request_status === 'for_sender') {
                    messageAppend(message, chatLog, currentUsername, formattedUsername);
                }
        
                if (message.username === currentUsername) {
                    let formattedFriendName = friendName.charAt(0).toUpperCase() + friendName.slice(1);
                    await messageAppendRecipent(message, chatLog, formattedFriendName, roomID); // ✅ Now allowed
                }
            }
        }
        // Scroll to the last message
        chatLog.scrollTop = chatLog.scrollHeight;

    } catch (error) {
        // console.log('Failed to load old messages:', error);
    }
}

// Function to mark messages as read
async function markMessagesAsRead(roomName) {
    // console.log('markMessagesAsRead() read=true');
    access = sessionStorage.getItem(`access`);
    try {
      const response = await fetch(`/chat/messages/${roomName}/`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // console.log('Messages marked as read:', data);
    } catch (error) {
    //   console.log('Error marking messages as read:', error);
    }
  }
 
// Function to append a message to the chat log
function messageAppend (message, chatLog, currentUsername, formattedUsername) {

    // console.log('messageAppend() called');

    if (!document.getElementById(`msg-${message.id}`)) {
        const isOwnMessage = message.username === currentUsername;
        const messageElement = document.createElement('li');
        messageElement.id = `msg-${message.id}`;
        messageElement.style.display = 'flex';
        messageElement.style.flexDirection = 'column';
        messageElement.style.alignItems = isOwnMessage ? 'flex-end' : 'flex-start';
        messageElement.style.color = isOwnMessage ? 'yellow' : 'orange';
        messageElement.style.marginBottom = '10px';
        messageElement.style.wordBreak = 'break-word';
        messageElement.style.width = '100%'; 
        messageElement.style.height = 'auto';

        // Create the main message content
        const messageContent = document.createElement('span');
        
        messageContent.textContent = message.content;
        messageContent.style.wordBreak = 'break-word';
        messageContent.style.height = 'auto';

        // messageContent.textContent = `${message.username === currentUsername ? 'You' : formattedUsername}: ${message.content}`;
    
        // console.log('message append .game_id: ' , message.game_id);
        if(message.message_type == 'message' && message.game_type === 'tournament') {
            const gameLink = document.createElement('a');
            gameLink.href = `/tournament/${message.game_id}`;
            gameLink.textContent = ` (Join Tournament)`;
            gameLink.style.color = 'blue';
            gameLink.style.textDecoration = 'underline';
            gameLink.style.display = 'inline'; // Initially hidden
            gameLink.id = `game-link-${message.game_id}`;

            messageContent.appendChild(gameLink);
        }   

        if(message.message_type !== 'message') {
            const gameLink = document.createElement('a');
            gameLink.href = `/pong/${message.game_id}`;
            gameLink.textContent = ` (Join Game)`;
            gameLink.style.color = 'blue';
            gameLink.style.textDecoration = 'underline';
            gameLink.style.display = 'inline'; // Initially hidden
            gameLink.style.alignSelf = 'flex-start';
            gameLink.id = `game-link-${message.game_id}`;

            messageContent.appendChild(gameLink);
            // console.log(" messageAppend() SPA behavior: Prevent reload, do custom navigation")
            // gameLink.addEventListener('click', function(event) {
                //     event.preventDefault();
                //     navigateTo(`/pong/${message.game_id}`);  // Your SPA navigation function
                // });
            }   
            // Create the timestamp element
            const timestamp = document.createElement('span');
            timestamp.textContent = new Date(message.timestamp).toLocaleString(); // Format the timestamp
            timestamp.style.fontSize = '0.8em';
            timestamp.style.color = 'gray'; // Gray color for the timestamp
            timestamp.style.display = 'block';
            
            messageElement.appendChild(timestamp);
            messageElement.appendChild(messageContent);
            // Append the message element to the chat log
            chatLog.appendChild(messageElement);
    }
}


async function messageAppendRecipent(message, chatLog, formattedFriendName, roomID) {
    // console.log('messageAppendRecipent() called');
    if (!document.getElementById(`msg-${message.id}`)) {
        const messageElement = document.createElement('li');
        messageElement.id = `msg-${message.id}`;
        messageElement.style.display = 'flex';
        messageElement.style.flexDirection = 'column';
        messageElement.style.marginTop = '55px';
        messageElement.style.marginBottom = '10px';
        messageElement.style.wordBreak = 'break-word';
        messageElement.style.width = '100%';
        messageElement.style.height = 'auto';

        // Create the main message content
        const messageContent = document.createElement('span');
        messageContent.style.fontSize = '1em';
        messageElement.style.color = 'orange';
        messageContent.style.fontWeight = 'bold';
        messageContent.style.wordBreak = 'break-word'; 
        messageContent.style.height = 'auto';

        // Create game link (Initially hidden)
        const gameLink = document.createElement('a');
        gameLink.href = `/pong/${message.game_id}`;
        gameLink.textContent = ` (Join Game)`;
        gameLink.style.color = 'blue';
        gameLink.style.textDecoration = 'underline';
        gameLink.style.display = 'none'; // Initially hidden
        gameLink.style.alignSelf = 'flex-start';
        gameLink.id = `game-link-${message.game_id}`;

        
        // Split message content into lines
        let messageParts = message.content.split("\n");
        
        // If there's a second line, wrap it in a <span> with red color
        if (messageParts.length > 1) {
            messageParts[1] = `<span style="color: red;">${messageParts[1]}</span>`;
        }
        
        // Join the lines back with <br> for proper line breaks
        messageContent.innerHTML = `${formattedFriendName}: ${messageParts.join("<br>")}`;
        
        // Create timestamp
        const timestamp = document.createElement('span');
        timestamp.textContent = new Date(message.timestamp).toLocaleString();
        timestamp.style.fontSize = '0.8em';
        timestamp.style.color = 'gray';
        timestamp.style.marginTop = '5px';
        timestamp.style.display = 'block';
        messageElement.appendChild(timestamp);
        
        messageElement.appendChild(messageContent);
        messageElement.appendChild(gameLink);
        
        
        // console.log("messageAppendRecipent() SPA behavior: Prevent reload, do custom navigation")
        // gameLink.addEventListener('click', function(event) {
        //     event.preventDefault();
        //     navigateTo(`/pong/${message.game_id}`);  // Your SPA navigation function
        // });
        
        // Create button wrapper
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.gap = '5px';
        buttonWrapper.style.marginTop = '5px';
        
        // Create Accept button
        const acceptButton = document.createElement('button');
        acceptButton.textContent = 'Accept';
        acceptButton.style.padding = '5px 10px';
        acceptButton.style.border = 'none';
        acceptButton.style.cursor = 'pointer';
        acceptButton.style.backgroundColor = 'green';
        acceptButton.style.color = 'white';
        
        // Create Reject button
        const rejectButton = document.createElement('button');
        rejectButton.textContent = 'Reject';
        rejectButton.style.padding = '5px 10px';
        rejectButton.style.border = 'none';
        rejectButton.style.cursor = 'pointer';
        rejectButton.style.backgroundColor = 'red';
        rejectButton.style.color = 'white';

        // Show game link if already accepted
        if (message.request_status === 'accepted') {
            acceptButton.textContent = 'Accepted';
            acceptButton.disabled = true;
            rejectButton.disabled = false;
            gameLink.style.display = 'inline'; // Show link if previously accepted
            
        } else if (message.request_status === 'rejected') {
            rejectButton.textContent = 'Rejected';
            rejectButton.disabled = true;
            acceptButton.disabled = false;
            gameLink.style.display = 'none';
        } else if (message.request_status === 'autorejected') {
            rejectButton.textContent = 'AutoRejected';
            rejectButton.disabled = true;
            acceptButton.disabled = false;
            gameLink.style.display = 'none';
            // showCustomAlert("This game does not exist it is rejected automatically!");
        }
        
        
        // Handle Accept Click
        acceptButton.onclick = async () => {
            if (message.game_id) {
                await handleInviteResponse(roomID, message.game_id, message.game_type, 'accepted', acceptButton, rejectButton);
            }
            else {
                await showCustomAlert("This game does not exist!");
            }
        };

        // Handle Reject Click
        rejectButton.onclick = async () => {
            await handleInviteResponse(roomID, message.game_id, message.game_type, 'rejected', acceptButton, rejectButton);
        };

        // Append buttons
        buttonWrapper.appendChild(acceptButton);
        buttonWrapper.appendChild(rejectButton);
        messageElement.appendChild(buttonWrapper);

        

        // Append to chat log
        chatLog.appendChild(messageElement);
    }
}

// Function to handle the accept/reject button click
export async function handleInviteResponse (roomID, gameId, game_type, status, acceptButton, rejectButton) {
    access = sessionStorage.getItem(`access`);
    
    //DEBUG===========
    // console.log('Access Token handleInviteResponse ():', access); // Debugging
    // console.log('status handleInviteResponse ():', status); // Debugging
    // console.log('roomID handleInviteResponse ():', roomID); // Debugging
    // console.log('type of room id handleInviteResponse ():',typeof roomID);
    // console.log('gameID handleInviteResponse ():', gameId); // Debugging
    //===========DEBUG
    try {
        const gameLink = acceptButton.closest('li').querySelector('a');
        if (gameId){
            const resualt = await fetch(`/pong/game_session/${gameId}/`, {
                method: "GET",
                "Authorization": `Bearer ${access}`
                });
            const game_db = await resualt.json();  // ✅ Use await to resolve the JSON first

            if (!resualt.ok)// if game does not exist so the buttons are disable
            {

                //DEBUG===========
                // console.log("game db:", game_db);
                // console.log("game_active from game db:", game_db.is_active);
                // console.log("player1_id:", game_db.player1_id);
                // console.log("player2_id:", game_db.player2_id);
                //===========DEBUG
                 
                acceptButton.disabled = true;
                rejectButton.disabled = true;
                await showCustomAlert("This game does not exist!");
            } else {
                // const response = await fetch(`/profiles/games/` , {
                const response = await fetch(`/chat/games/` , {

                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${access}`,
                        "X-GameId": gameId // Custom header
                    }
                });
        
                const data = await response.json();
                if (response.ok) {
                    // console.log("gamerequest db: ", data);
                    if (data.length > 0) {
                        // console.log("status in gamerequest db: ", data[0].status);
                    } else {
                        // console.log("No game request found.");
                    }
        
                    // if(data[0].status === 'autorejected') // i think i dont need to check this part if game has been deleted from game db
                    if(data[0].status === 'autorejected') // accepted, pending => autorejected but when game db is created
                    {
                        acceptButton.textContent = 'Accepte';
                        // acceptButton.disabled = true;
                        rejectButton.textContent = 'AutoRejected';
                        // rejectButton.disabled = true;
                        await showCustomAlert("This game does not exist it is rejected automatically!");
                    }
                    else {
                        try {
                            // const response = await fetch(`/profiles/game-request/${roomID}/response/`, {

                            const response = await fetch(`/chat/game-request/${roomID}/response/`, {
                    
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${access}` 
                                },
                                body: JSON.stringify({  
                                    status, 
                                    game_type, 
                                    roomID,
                                    gameId,
                    
                                })
                            });
                    
                            const data = await response.json();
                    
                            // if (response.ok) {
                            //     await showCustomAlert(`Game request ${status} successfully!`);
                            //     console.log(`Game request ${status} successfully!`);

                            //     //update the UI here
                            // } else {
                            //     await showCustomAlert(`Error: ${data.error}`);
                            //     console.log(`Error: ${data.error}`);
                            // }
                        } catch (error) {
                            // console.log("Error updating game request:", error);
                        }
                        if(status === 'accepted') {
                            // Change the buttons' text 
                            acceptButton.textContent = 'Accepted';
                            // Disable buttons so they cannot be clicked again
                            acceptButton.disabled = true;
                            rejectButton.textContent = 'Reject';
                            rejectButton.disabled = false;
                    
                            // 🔥 Show the game link immediately after accepting
                            if (gameLink) {
                                gameLink.style.display = 'inline';
                            }
                        } else {
                            rejectButton.textContent = 'Rejected';
                            rejectButton.disabled = true;
                            acceptButton.textContent = 'Accept';
                            acceptButton.disabled = false;
                            gameLink.style.display = 'none';
                        }
                    
                        try {
                            // console.log('status in handleInviteResponse() after try:',status);
                            const response = await fetch(`/chat/messages/${roomID}/update/`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${access}`
                                },
                                body: JSON.stringify({                 
                                    status, 
                                    game_type,
                                    gameId,
                                })
                            });
                            const data = await response.json();
                    
                            if (response.ok) {
                                // console.log(`message request ${status} successfully!`);
                                //update the UI here
                            } else {
                                await showCustomAlert(`Error: ${data.error}`); 
                            }
                        } catch (error) {
                            // console.log("Error updating message request:", error);
                            // await showCustomAlert("An error occurred while updating the request in message.");
                        }
        
                    }
        
                    //update the UI here
                } else {
                    await showCustomAlert(`Error: ${data.error}`);
                }
            }
        }else
            await showCustomAlert(`this game does not exist!`);

    } catch (error) {
        await showCustomAlert("Game does not exist!", 'OK');
    }
 
}

// Function to handle the accept/reject button click
export async function handleInviteResponseAuto (gameId, status) {
    access = sessionStorage.getItem(`access`);

    //DEBUG===========
    // console.log('Access Token handleInviteResponseAuto ():', access); // Debugging
    // console.log('status handleInviteResponseAuto ():', status); // Debugging
    // console.log('gameId handleInviteResponseAuto ():', gameId); // Debugging
    //===========DEBUG

    try {
        if (gameId){
            // const response = await fetch(`/profiles/game-request/autoupdate/`, {
            const response = await fetch(`/chat/game-request/autoupdate/`, {

                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${access}` 
                },
                body: JSON.stringify({  
                    status, 
                    gameId,
                })
            });

            const data = await response.json();

            // if (response.ok) {
            //     // await showCustomAlert(`Game request ${status} successfully!`);
            //     console.log(`Game request ${status} successfully!`);    
            //     //update the UI here
            // } else {
            //     console.log(`Error: ${data.error}`);
            // }
        }
    } catch (error) {
        // console.log("Error updating game request:", error);
    }


    try {
        const username = await getUsername();
        // **Check if the friend is blocked before sending the message**
       if (gameId){
            // const responsegame = await fetch(`/profiles/games/` , {
            const responsegame = await fetch(`/chat/games/` , {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${access}`,
                    "X-GameId": gameId // Custom header
                }
            });

            const gamedata = await responsegame.json();
            if (responsegame.ok) {

                //DEBUG===========
                // console.log("gamerequest db: ", gamedata);
                // if (gamedata.length > 0) {
                //     console.log("recipient_id in gamerequest db: ", gamedata[0].recipient);
                // } else {
                //     console.log("No game request found.");
                // }
                //DEBUG===========

                const blockCheckResponse = await fetch(`/profiles/${gamedata[0].recipient}/blocked/list/`, {
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
                // console.log('Blocked users handleInviteResponseAuto():', blockedUsers);
                const isBlocked = blockedUsers.some(user => user.blocked_user.blocked_user_id  === username);
                // console.log('isBlocked handleInviteResponseAuto():', isBlocked);

                if (!isBlocked) {
                    // console.log('status in handleInviteResponseAuto() after try:',status);
                    // console.log('gameid in handleInviteResponseAuto() after try:',gameId);

                    const response = await fetch(`/chat/message/autoupdate/`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${access}`
                        },
                        body: JSON.stringify({                 
                            status, 
                            gameId,
                        })
                    });
                    const data = await response.json();
            
                    if (response.ok) {
                        // console.log(`message autoupdate request ${status} successfully!`);
                        // update the UI here
                    } else {
                        // console.log(`Error: ${data.error}`); 
                    }
                }
            }
    }
        
    } catch (error) {
        // console.log("Error updating message request:", error);
        // await showCustomAlert("An error occurred while updating the request in message.");
    }
}
    
