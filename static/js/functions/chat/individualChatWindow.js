import { loadOldMessages } from './utils/loadmessages.js'
import  webSocketManager  from './websocketManager.js'
import { sendMessage } from './utils/sendMessage.js';
import { blockUser } from "../block/blockUser.js";
import { sendInvitation } from './utils/sendInvitation.js';
import { getGameId } from '../game/getGameId.js';


export class IndividualChatWindow {

    constructor(user, friendName) {
        this.user = user;
        this.unread_from = null;
        this.unread = false;
        this.friendName = friendName;
        this.friendID = null;
        this.roomName = null;
        this.roomID = null;
        this.gameId = null;
        this.individualChatsContainer = null;
        // console.log('inidivual chat window created between ', this.user, ' and ', this.friendName);
    }

    async init() {
        try {
            // clean previous window if it has not been closed
            this.cleanPreviousWindow();
            
            // init roomName et roomID
            // /!\ utiliser handleFetch ici :
            const data = await this.createRoomName();
            this.roomName = data.room_name;
            this.roomID = data.room_id;
            
            // await loadOldMessages(this.roomName, this.friendName, this.roomID);
            
            let response = await fetch(`/authentication/get-user/?username=${this.friendName}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem(`access`)}`
                  },
            }); 
            if (response.ok) {
                response = await response.json();
            }

            this.friendID = response.id;
            // console.log('friendID:', this.friendID);

            // init WebSocket
            await webSocketManager.connect(this.roomID, this.roomName, this.friendName); 
            
            //DEBUG=========================
            // console.log(webSocketManager.getSocketStatus(), 'color: green');
            //=========================DEBUG
            
            // inserer le html apres avoir init tous les attributs de la classe
            this.createNewWindow();
            // this.setupEventListeners();
            
        } catch (error) {
            // console.log('%cFailed to initialize chat:', 'color: red', error);
        }
    }
    
    cleanPreviousWindow () {
        // console.log('cleaning previous window');
        this.individualChatsContainer = document.getElementById('individual-chats-container');
       
        // Remove all existing chat windows to ensure only one is open
        const existingChatWindows = this.individualChatsContainer.querySelectorAll('.chat-window');
        existingChatWindows.forEach(chatWindow => {
            webSocketManager.closeSocket();
            // console.log(webSocketManager.getSocketStatus(), 'color: red');
            chatWindow.remove()
        });

        // Properly close existing WebSocket connection
        if (webSocketManager.getSocketStatus() === WebSocket.OPEN) {
            webSocketManager.closeSocket();
            // console.log(webSocketManager.getSocketStatus(), 'color: green');
        }

    }

    async createNewWindow() {

        sessionStorage.setItem('indivChatOpen', 'true');
        sessionStorage.setItem('lastChat', this.friendID);

        const chatWindow = document.createElement('div');
        chatWindow.id = `chat-window-${this.friendName}`;
        chatWindow.classList.add('cyberpunk', 'black', 'chat-window');
        let formattedUsername = this.friendName.charAt(0).toUpperCase() + this.friendName.slice(1);
    
        // Start building the HTML content
        if (this.friendName === "info") {
            chatWindow.innerHTML = `
                <div class="chat-header">
                    <h4 class="cyberpunk glitched">Tournament Info</h4> 
                    <button id="close-chat-window" class="cyberpunk red close-chat-window" data-username="${this.friendName}">x</button>
                </div>
                <ul id="chat-log-${this.roomName}" class="chat-log"></ul>`;
        }
        else {
            chatWindow.innerHTML = `
                <div class="chat-header">
                    <h4 id="indiv-chat-title" class="cyberpunk glitched">${this.friendName === "info" ? "Tournament Info" : "Chat with " + formattedUsername}</h4>
                    <div class="chat-buttons-container"> 
                        <button class="game-1v1-invite-btn" data-username="${this.friendName}">Invite 1vs1</button>
                        <button class="block-user-btn" data-username="${this.friendName}">Block User</button>
                    </div> 
                    <button id="close-chat-window" class="cyberpunk red close-chat-window" data-username="${this.friendName}">x</button>
                </div>
                <div class="chat-body">
                ${this.friendName !== "info" ? `
                    <div class="message-container">
                            <div id="chat-log-container">
                                <ul id="chat-log-${this.roomName}" class="chat-log"></ul>
                                <form id="chat-form-${this.friendName}">
                                    <input type="text" id="chat-message-${this.friendName}" placeholder="Type a message" />
                                </form>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
               
        this.individualChatsContainer.appendChild(chatWindow);
        this.individualChatsContainer.style.display = 'block';

        // chat log de differente taille pour info et pour les autres
        const chatLog = document.getElementById(`chat-log-${this.roomName}`);
        if (this.friendName === "info") { chatLog.style.maxHeight = 'none'; } else { chatLog.style.maxHeight = '150px'; }

        await loadOldMessages(this.roomName, this.friendName, this.roomID);
    
        // Make sure the close button works regardless of friendName
        const closeButton = chatWindow.querySelector('.close-chat-window');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeWindow();
            });
        }
        // ✅ Safe to call after DOM is ready
        this.setupEventListeners();
    }
    

    async setupEventListeners() {
        
        // touche entree
        if (this.friendName !== "info") {
            const chatForm = document.getElementById(`chat-form-${this.friendName}`);
            if (chatForm) {
                chatForm.addEventListener('submit', async (event) => { 
                    event.preventDefault(); // Empêche le rechargement de la page
                    
                    // console.log('touche entre event listeners');
                    
                    // const messageInput = document.getElementById(`chat-message-${this.friendName}`);
                    const messageInput = document.querySelector(`#chat-message-${this.friendName}`);
                    let message;
                    if (messageInput) {
                        message = messageInput.value.trim();
                    }
                    
                    if (message) {
                        await sendMessage(this.roomID, this.roomName, this.friendName, this.user, message, 'message', 'none');
                        messageInput.value = '';
                    }
                });     
            }
            
            // 1vs1 game invite button
            const gameInviteButton = document.querySelector('.game-1v1-invite-btn');
            if (gameInviteButton) {
                gameInviteButton.addEventListener('click', async () => {
                    await this.sendInivitation('1v1');
                });
            }
        
            const blockUserButton = document.querySelector('.block-user-btn');
            if (blockUserButton) {
                blockUserButton.addEventListener('click', async () => {
                    await blockUser(this.friendName);
                });
            }

            // close window button
            const closeButton = document.querySelector('.close-chat-window');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    this.closeWindow();
                });
            }
        }
    }


    async createRoomName() {
        // console.log("createRoomName()");
        let access = sessionStorage.getItem(`access`);
        if (access) {
            const createRoomResponse = await fetch(`/chat/rooms/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access}`,
                },
                body: JSON.stringify({ friendUsername: this.friendName }),
            });

            if (!createRoomResponse.ok) {
                const createErrorData = await createRoomResponse.json();
                // console.log('%cError creating room:', 'color: red;', createErrorData);
            } else {
                const data = await createRoomResponse.json();
                // console.log('%cRoom created successfully or does exist:', 'color: green;', data);
                return data;
            }
        } else {
            // console.log('%cAccess token not found.', 'color: red;');
        }
    }

    closeWindow() {
        this.individualChatsContainer.style.display = 'none';
        sessionStorage.setItem('indivChatOpen', 'false');
        // console.log('individual chat window closed');
        const chatWindow = document.getElementById(`chat-window-${this.friendName}`);
        if (chatWindow) {
            webSocketManager.closeSocket();

            //DEBUG=========================
            // console.log(webSocketManager.getSocketStatus(), 'color: green');
            //=========================DEBUG
            
            chatWindow.remove();
        }
    }

    async sendInivitation(mode) {
        const players = [this.user, this.friendName];
        this.gameId = await getGameId(mode, players); // Pia added players for change in DB
        // console.log('clicked on %s game btn in openIndividualChat:', mode);
        const message = "";
        // sendInvitation(this.roomID, this.roomName, this.friendName, this.user);
        sendInvitation(this.roomID, this.gameId, this.roomName, this.friendName, this.user, message, 'game_request', mode);
    }

}
