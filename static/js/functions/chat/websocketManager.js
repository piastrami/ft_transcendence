

import { getUsername } from "../utils/getUsername.js";
import { handleInviteResponse } from "./utils/loadmessages.js";
import { getIp } from '../game/getIp.js';

class WebSocketManager {
    constructor() {

        if (WebSocketManager.instance) {
            return WebSocketManager.instance;
        }

        this.chatSocket = null; // Start with null
        WebSocketManager.instance = this;
    }

    // Function to initialize the WebSocket
    async connect(roomID, roomName, friendName) {

        const currentUsername = await getUsername()
        this.ip = await getIp(); 
        this.access_token = sessionStorage.getItem('access');
        this.chatSocket = new WebSocket(  
            (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
            this.ip + ':8001/ws/chat/' + roomName + '/' + friendName + '/' + `?token=${this.access_token}`
        );

        this.chatSocket.onopen = () => {
        };

        this.chatSocket.onmessage = (e) => {

            //=========DEBUGGING=========
            // console.log(this.getSocketStatus(), 'color: green');
            //=========DEBUGGING=========
            const data = JSON.parse(e.data);

            //DEBUGGING================
            // console.log("DATA in onmessage():", data);
            // console.log("request_status in onmessage():", data.request_status);
            // console.log('roomID onmessage():', roomID);
            // console.log('gameID onmessage():', data.gameId);
           //================DEBUGGING

            // Handle incoming message
            const chatLog = document.getElementById(`chat-log-${roomName}`);
            if (chatLog) {
                const isOwnMessage = data.username === currentUsername;
                const messageElement = document.createElement('li');
                messageElement.style.display = 'flex';
                messageElement.style.flexDirection = 'column';
                messageElement.style.alignItems = isOwnMessage ? 'flex-end' : 'flex-start';
                messageElement.style.color = isOwnMessage ? 'yellow' : 'orange';
                messageElement.style.marginBottom = '10px';
                messageElement.style.wordBreak = 'break-word';
                messageElement.style.height = 'auto';
                messageElement.style.width = '100%';
               
                // Create the main message content
                const messageContent = document.createElement('span');
                messageContent.style.wordBreak = 'break-word';
                messageContent.style.height = 'auto'; // Allow natural height

                let formattedUsername = data.username.charAt(0).toUpperCase() + data.username.slice(1);

                // Check if the sender is 'info', and only display the message if true
                if (data.username === 'info') {
                    messageContent.textContent = data.message;
                } else {
                    messageContent.textContent = data.message;

                    // messageContent.textContent = `${data.username === currentUsername ? 'You' : formattedUsername}: ${data.message}`;
                }

                // Create the timestamp element
                const timestamp = document.createElement('span');
                const messageDate = new Date(data.timestamp); 
                timestamp.textContent = messageDate.toLocaleString(); 
                timestamp.style.fontSize = '0.8em'; 
                timestamp.style.color = 'gray';
                timestamp.style.display = 'block'; 
                timestamp.style.marginTop = '5px'; 
                messageElement.appendChild(timestamp);

                messageElement.appendChild(messageContent);
                // console.log('%cdata in onmessage():', 'color: yellow', data);

                // console.log('%cdata.gameId in onmessage():', 'color: yellow', data.gameId);
                if (data.game_type === 'tournament') {
                    // console.log('in game link for tournament');
                    const gameLink = document.createElement('a');
                    gameLink.href = `/tournament/${data.gameId}`;//ihave to change this
                    gameLink.textContent = ` (Join Semi/final)`;// and this
                    gameLink.style.color = 'blue';
                    gameLink.style.textDecoration = 'underline';
                    gameLink.style.display = 'inline'; // Initially hidden

                    // Appendgame link
                    messageElement.appendChild(gameLink);
                }
                if (data.request_status === 'for_sender'){              
                    // Create game link (Initially hidden)
                    // console.log('data.gameId for_sender Onmessage():', data.gameId);
                    //fetch game db             
                    const gameLink = document.createElement('a');
                    gameLink.href = `/pong/${data.gameId}`;
                    gameLink.textContent = ` (Join Pong)`;
                    gameLink.style.color = 'blue';
                    gameLink.style.textDecoration = 'underline';
                    gameLink.style.display = 'inline'; // Initially hidden

                    // Appendgame link
                    messageElement.appendChild(gameLink);
                }
                if (data.request_status === 'pending' ) {
                                   
                    // Create game link (Initially hidden)
                    const gameLink = document.createElement('a');
                    gameLink.href = `/pong/${data.gameId}`;
                    gameLink.textContent = ` (Join Pong)`;
                    gameLink.style.color = 'blue';
                    gameLink.style.textDecoration = 'underline';
                    gameLink.style.display = 'none'; // Initially hidden

                    // Appendgame link
                    messageElement.appendChild(gameLink);

                    messageContent.style.fontSize = '1em';
                    messageElement.style.color = 'orange';
                    messageContent.style.fontWeight = 'bold';
                    messageContent.style.fontSize = '1.2em';

                    // Create a wrapper for the buttons
                    const buttonWrapper = document.createElement('div'); // Initialize buttonWrapper here
                    buttonWrapper.style.display = 'inline-flex'; // Use inline-flex to place buttons next to each other
                    buttonWrapper.style.gap = '5px';
                    buttonWrapper.style.marginTop = '5px'; // Space between message and buttons
                   
                    // Create the accept button
                    const acceptButton = document.createElement('button');
                    acceptButton.textContent = 'Accept';
                    acceptButton.style.padding = '5px 10px';
                    acceptButton.style.border = 'none';
                    acceptButton.style.cursor = 'pointer';
                    acceptButton.style.backgroundColor = 'green';
                    acceptButton.style.color = 'white';

                    // Handle Accept Click
                    acceptButton.onclick = async () => {
                        await handleInviteResponse(roomID, data.gameId, data.game_type, 'accepted', acceptButton, rejectButton);
                    };
            
                    // Create the reject button
                    const rejectButton = document.createElement('button');
                    rejectButton.textContent = 'Reject';
                    rejectButton.style.padding = '5px 10px';
                    rejectButton.style.border = 'none';
                    rejectButton.style.cursor = 'pointer';
                    rejectButton.style.backgroundColor = 'red';
                    rejectButton.style.color = 'white';

                    // Handle Reject Click
                    rejectButton.onclick = async () => {
                       await handleInviteResponse(roomID, data.gameId, data.game_type, 'rejected', acceptButton, rejectButton);
                    };
            
                    buttonWrapper.appendChild(acceptButton);
                    buttonWrapper.appendChild(rejectButton);
            
                    // Append buttons below the message
                    messageElement.appendChild(buttonWrapper);
                }
 
                // Append the message element to the chat log
                chatLog.appendChild(messageElement);
        
                // Scroll to the last message
                chatLog.scrollTop = chatLog.scrollHeight;
            }
        };

        this.chatSocket.onclose = (e) => {
            // console.log(this.getSocketStatus(), 'color: red');
        };

        this.chatSocket.onerror = (e) => {
            // console.log('WebSocket error:', e);
            // console.log(this.getSocketStatus(), 'color: red');
        };
    }

    getSocket() {
        return this.chatSocket;
    }

    closeSocket() {
        if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
            this.chatSocket.close();
        }
    }

    getSocketStatus() {
        if (!this.chatSocket) {
            return "%cNo Chat WebSocket connection established.";
        }
        switch (this.chatSocket.readyState) {
            case 0:
                return ("%cCONNECTING CHAT WEBSOCKET...");
            case 1:
                return ("%cCHAT WEBSOCKET OPEN");
            case 2:
                return ("%cCLOSING CHAT WEBSOCKET..." );
            case 3:
                return ("%cCHAT WEBSOCKET CLOSED");
            default:
                return ("%cUNKNOWN STATE IN CHAT WEBSOCKET");
        }
    }
}

// Export an instance of WebSocketManager to ensure it's a singleton
const webSocketManager = new WebSocketManager();
export default webSocketManager;
