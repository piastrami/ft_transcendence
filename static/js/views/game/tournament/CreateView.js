import AbstractView from "../../AbstractView.js";
import { handleFetchErrors } from "../../../functions/utils/HandleFetchErrors.js";
import { navigateTo } from "../../../index.js";
import { getUsername } from "../../../functions/utils/getUsername.js";
import { getIp } from "../../../functions/game/getIp.js";
import { MainChatWindow } from "../../../functions/chat/mainChatWindow.js";
import { loadOnlineUsers } from "../../../functions/utils/loadOnlineUsers.js";
import { gameNotif } from "../../../functions/notification/game/gameInvitation.js";

export default class TournamentCreateView extends AbstractView {

    constructor() {
        super();
        this.selectedUsers = [];
        this.onlineUsers = [];
        this.pollingActive = false;
        this.updateInterval = null;
        this.originalBackground = null;
        this.currentUser = null;
        this.urlID = null;
        this.tournamentURL = null;
        this.ip = null;
        this.chat = null;
    }

    async getHtml() {
        // Store the original background before changing it 
        if (!this.originalBackground) {
            const computedStyle = getComputedStyle(document.documentElement);
            this.originalBackground = computedStyle.backgroundImage;
        }

        document.documentElement.classList.add('tournament-background');
        document.body.classList.add('tournament-background');
       
        this.onlineUsers = await loadOnlineUsers();
        
        let usersHtml = '';
        if (this.onlineUsers.size === 0) { 
            usersHtml = '<p class="no-users">No potential players online</p>';
        }
        else {
            this.onlineUsers.forEach(username => {
                // Check if this user is in the selectedUsers array to preserve selection state
                const isSelected = this.selectedUsers.includes(username) ? 'selected' : '';
                
                usersHtml += `
                    <div class="user-item-tourno ${isSelected}" data-username="${username}">
                        <div class="user-avatar">${username.charAt(0).toUpperCase()}</div>
                        <span class="username">${username}</span>
                    </div>
                `;
            });
        }
        
        let html = `
            <div class="tournament-container">
                <div class="selection-panel">
                    <div class="selection-panel-header"></div>
                    <h2 class="cyberpunk glitched">Select 3 players for your tournament</h2>
                    <div class="user-list-tourno">
                        ${usersHtml}
                    </div>
                    <div class="selection-status">
                    <p class="cyberpunk inverse" id="players-selected-text">Players selected: <span id="selected-players">${this.selectedUsers.length}</span>/3</p>
                    </div>
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

        // First, ensure we have the chat instance
        this.chat = await MainChatWindow.getChat();

        // Open chat button
        const openChatBtn = document.getElementById('open-chat-button');
        if (openChatBtn) {
            // Clone the button to remove any existing event listeners
            const newOpenChatBtn = openChatBtn.cloneNode(true);
            openChatBtn.parentNode.replaceChild(newOpenChatBtn, openChatBtn);
            
            // Add the event listener to the new button
            newOpenChatBtn.addEventListener('click', () => {
                // console.log('%cTournamentCreateView => Chat button clicked',        "color: red");
                if (this.chat) {
                    this.chat.openChatPopover();
                } 
            });
        } 
        
        this.startPolling();
        const userItems = document.querySelectorAll('.user-item-tourno');

        const confirmButton = document.getElementById('confirm-tournament-selection');
        const errorMessage = document.getElementById('tourno-error-message');
        const selectedCountElement = document.getElementById('selected-players');
    
        userItems.forEach(item => {
            item.addEventListener('click', () => {
                // console.log(`User item clicked for username ${item.dataset.username}`);
                const username = item.dataset.username;
    
                if (item.classList.contains('selected')) {
                    this.selectedUsers = this.selectedUsers.filter(name => name !== username);
                    item.classList.remove('selected');
                }
                else {
                    if (this.selectedUsers.length < 3) {
                        this.selectedUsers.push(username);
                        item.classList.add('selected');
                    }
                    else {
                        errorMessage.textContent = "You can only select 3 players";
                    }
                }
    
                selectedCountElement.textContent = this.selectedUsers.length;
            });
        });

        if (confirmButton) {
            confirmButton.addEventListener('click', async () => {
                // console.log("Send invites button clicked");
                if (this.selectedUsers.length < 3) {
                    errorMessage.textContent = "You must select 3 players";
                    return;
                }
                errorMessage.textContent = "";
                // console.log("Selected users: ", this.selectedUsers);
                // console.log("Selected count: ", this.selectedUsers.length);
                // console.log("%cReady to invite users", 'color: green');
                
                const response = await handleFetchErrors('/pong/generate_id/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                this.urlID = response.game_id;
                await this.createTournament();
                if (!this.currentUser) {
                    this.currentUser = await getUsername();
                }
                for (const user of this.selectedUsers) {
                    await gameNotif(this.urlID, user, "tournament");
                    // console.log(`Invitation sent to ${user}`);
                }
                navigateTo(`/tournament/${this.urlID}`);
            });
        }
    } 
    
    async createTournament() {
        const access = sessionStorage.getItem('access');

        // if (!access)
            // console.log('No access token found');
        const newTournament = await handleFetchErrors(`/pong/tournament/new/`, 
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access}`
                },
                body: JSON.stringify({
                    tournament_id: this.urlID
                })
            }
        );
        // console.log("New tournament created: ", newTournament);
        
    }
    
    async addPlayerToTournament(player) {
        if (!player) {
            player = await getUsername();
        }
        // console.log(`Adding ${player} to tournament`);
        
        const access = sessionStorage.getItem('access');
        // if (!access)
            // console.log('No access token found');
        
        const playerAdded = await handleFetchErrors(`/pong/tournament/add/${player}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access}`
            },
            body: JSON.stringify({
                tournament_id: this.urlID
            })
        });
        
        return playerAdded;
    }

    async startPolling() {
        if (this.pollingActive) {
            return;
        }
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
                    document.querySelector("#app").innerHTML = await this.getHtml();
                    await this.setupEventListeners();
                }
            }
            catch (error) {
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
        this.stopPolling();

        document.documentElement.classList.remove('tournament-background');
        document.body.classList.remove('tournament-background');
        document.documentElement.style.backgroundImage = this.originalBackground;
        document.documentElement.style.backgroundSize = 'cover';
        
        const overlay = document.querySelector('.full-page-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }
}
