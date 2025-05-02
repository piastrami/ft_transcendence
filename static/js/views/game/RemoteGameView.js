import AbstractView from "../AbstractView.js";
import { navigateTo } from "../../index.js";
import { getGameId } from "../../functions/game/getGameId.js";
import { MainChatWindow } from "../../functions/chat/mainChatWindow.js";
import { getUsername } from "../../functions/utils/getUsername.js";
import { loadOnlineUsers } from "../../functions/utils/loadOnlineUsers.js";
import { gameNotif } from "../../functions/notification/game/gameInvitation.js";
import { EventManager } from "../../functions/utils/eventManager.js";

export default class RemoteGameView extends AbstractView {

    constructor() {
        super();
        this.pongGame = null;
        this.selectedUser = null;
        this.onlineUsers = [];
        this.pollingActive = false;
        this.updateInterval = null;
        this.currentUser = null;
        this.chat = null;
        this.notifWSManager = null;
        this.eventManager = new EventManager();
    }

    async getHtml() {
        this.onlineUsers = await loadOnlineUsers();

        let usersHtml = '';
        if (this.onlineUsers.size === 0) { 
            usersHtml = '<p class="no-users">No potential players online</p>';
        }
        else {
            this.onlineUsers.forEach(username => {
                const isSelected = this.selectedUser === username ? 'selected' : '';
                
                usersHtml += `
                    <div class="user-item-tourno ${isSelected}" data-username="${username}">
                        <div class="user-avatar">${username.charAt(0).toUpperCase()}</div>
                        <span class="username">${username}</span>
                    </div>
                `;
            });
        }
        let selectedPlayerHtml = '';
        if (this.selectedUser !== null) {
            selectedPlayerHtml = `
                <p class="cyberpunk inverse" id="players-selected-text">Player selected: <span id="selected-players">${this.selectedUser}</p>
            `;
        }
        else {
            selectedPlayerHtml = `<p class="cyberpunk inverse" id="players-selected-text">No player selected</p>`;
        }
        let html = `
            <div class="tournament-container">
                <div class="selection-panel">
                    <div class="selection-panel-header"></div>
                    <h2 class="cyberpunk glitched">Select 1 player to play pong with</h2>
                    <div class="user-list-tourno">
                        ${usersHtml}
                    </div>
                    <div class="selection-status">${selectedPlayerHtml}</div>
                    <div class="error-message" id="tourno-error-message"></div>
                    <button id="confirm-tournament-selection" class="cyberpunk blue">Send invites</button>
                    <div class="selection-panel-footer"></div>
                </div>
            </div>
            <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
        `;

        return html;
    }

    async setupEventListeners() {
        this.chat = await MainChatWindow.getChat();

        const openChatBtn = document.getElementById('open-chat-button');
        if (openChatBtn) {
            this.eventManager.addEventListener(openChatBtn, 'click', this.handleChatButtonClick, this);
        } else {
            // console.log('open-chat-button not found');
        }
        
        this.startPolling();
        const userItems = document.querySelectorAll('.user-item-tourno');
        userItems.forEach(item => {
            this.eventManager.addEventListener(item, 'click', this.handleUserItemClick, this);
        });
        
        const confirmButton = document.getElementById('confirm-tournament-selection');
        if (confirmButton) {
            this.eventManager.addEventListener(confirmButton, 'click', this.handleConfirmButtonClick, this);
        }
    }
    
    handleChatButtonClick() {
        // console.log('%cRemoteGameView => Chat button clicked',  "color: red");
        if (this.chat) {
            this.chat.openChatPopover();
        } else {
            // console.log('Chat instance is null');
        }
    }

    handleUserItemClick(event) {
        const item = event.currentTarget;
        // console.log(`item is ${item}`)
        // console.log(`User item clicked for username ${item.dataset.username}`);
        const username = item.dataset.username;
        
        // Remove selected class from all items
        const userItems = document.querySelectorAll('.user-item-tourno');
        userItems.forEach(userItem => {
            userItem.classList.remove('selected');
        });
        
        // If clicking on the already selected user, deselect it
        if (this.selectedUser === username) {
            this.selectedUser = null;
            document.getElementById('players-selected-text').innerHTML = 'No player selected';
        } 
        else {
            // Otherwise, select the new user
            this.selectedUser = username;
            item.classList.add('selected');
            document.getElementById('players-selected-text').innerHTML = `Player selected: <span id="selected-players">${this.selectedUser}</span>`;
        }
        // Clear any error messages
        const errorMessage = document.getElementById('tourno-error-message');
        if (errorMessage) {
            errorMessage.textContent = "";
        }
    }

    async handleConfirmButtonClick() {
        // console.log("Invite to play button clicked");
        const errorMessage = document.getElementById('tourno-error-message');
        
        if (this.selectedUser === null) {
            errorMessage.textContent = "You must select a player";
            return;
        }
        this.stopPolling();
        errorMessage.textContent = "";
        // console.log("Selected user: ", this.selectedUser);
        // console.log("%cReady to invite user", 'color: green');
        if (!this.currentUser) {
            this.currentUser = await getUsername();
        }
        const players = [this.currentUser, this.selectedUser];
        const game_id = await getGameId("1vs1", players); // game exists in DB at this stage
        await gameNotif(game_id, this.selectedUser, "pong");
        
        if (game_id !== null) {
            // Navigate to the game page
            navigateTo(`/pong/${game_id}`);
        }
    }

    async startPolling() {
        if (this.pollingActive) {
            return;
        }
        
        // console.log('Starting polling');
        this.pollingActive = true;
        
        this.updateInterval = setInterval(async () => {
            try {
                const updatedOnlineUsers = await loadOnlineUsers();
                // Check if online users have changed (size or members)
                let hasChanged = updatedOnlineUsers.size !== this.onlineUsers.size;
                
                if (!hasChanged) {
                    // Check for differences in the sets
                    for (const user of updatedOnlineUsers) {
                        if (!this.onlineUsers.has(user)) {
                            hasChanged = true;
                            break;
                        }
                    }
                }
                
                if (hasChanged) {
                    // console.log("Online users changed, refreshing view");
                    document.querySelector("#app").innerHTML = await this.getHtml();
                    await this.setupEventListeners();
                    
                    // After refreshing the view and setting up event listeners,
                    // make sure the chat's DOM references are updated too
                    if (this.chat) {
                        await this.chat.refreshDomReferences();
                    }
                }
            } catch (error) {
                // console.log('Error fetching online users:', error);
            }
        }, 2000);
    }
    
    async stopPolling() {
        // console.log('Stopping polling');
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.pollingActive = false;
    }
    
    async cleanup() {
        this.eventManager.removeAll();
        this.stopPolling();
        if (this.notifWSManager !== null) {
            // this.notifWSManager 
        }

        // Removing elements from the DOM:
        const userItems = document.querySelectorAll('.user-item-tourno');
        userItems.forEach(item => {
            item.remove();
        });
        const confirmButton = document.getElementById('confirm-tournament-selection');
        if (confirmButton) {
            confirmButton.remove();
        }
        const avatars = document.querySelectorAll('.user-avatar');
        avatars.forEach(avatar => {
            avatar.remove();
        });
        const usernames = document.querySelectorAll('.username');
        usernames.forEach(username => {
            username.remove();
        });
        const tournamentContainer = document.querySelector('.tournament-container');
        if (tournamentContainer) {
            tournamentContainer.remove();
        }
        const chatButton = document.getElementById('open-chat-button');
        if (chatButton) {
            chatButton.remove();
        } 
    }
}
