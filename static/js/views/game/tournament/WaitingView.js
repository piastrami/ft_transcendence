import AbstractView from '../../AbstractView.js';
import { handleFetchErrors } from "../../../functions/utils/HandleFetchErrors.js";
import { navigateTo } from "../../../index.js";
import { showCustomAlert } from '../../../functions/utils/customAlert.js';
import { MainChatWindow } from '../../../functions/chat/mainChatWindow.js';

export default class TournamentWaitingView extends AbstractView {
    constructor(currentUser, tournamentID, hasJoined) {
        super();
        this.tournamentID = tournamentID;
        this.currentUser = currentUser;
        this.tournament = null;
        this.hasJoined = hasJoined;
        this.access = null;
        this.poller = null;
        this.chat = null;
    }

    async getHtml() {
        try {
            this.access = sessionStorage.getItem('access');
            if (!this.access) {
                await showCustomAlert('You must be logged in to view this page');
                navigateTo('/login');
                return;
            }
            this.tournament = await handleFetchErrors(`/pong/tournament/info/${this.tournamentID}/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.access}`,
                }
            });
            this.players = this.tournament.players;
            const playerCount = this.players.length;
            const maxPlayers = this.tournament.max_players || 4;
            const playersNeeded = maxPlayers - playerCount;

            this.players = this.tournament.players;
            let playersHTML = '';
            for (let i = 0; i < maxPlayers; i++) {
                if (i < playerCount) {
                    const player = this.players[i];
                    const username = player.user_profile.user.username;
                    let alias = player.alias;
                    if (username === this.currentUser) {
                        alias += ' (You)';
                    }
                    if (alias === 'undefined (You)' || alias === 'undefined' || alias.trim() === '') {
                        alias = username;
                    }
                    playersHTML += `
                        <div class="player-slot filled">
                            <div class="player-avatar">${alias.charAt(0).toUpperCase()}</div>
                            <span class="player-name">${alias}</span>
                        </div>
                    `;
                } else {
                    playersHTML += `
                        <div class="player-slot empty">
                            <div class="player-avatar">?</div>
                            <span class="player-name">Waiting for player to join...</span>
                        </div>
                    `;
                }
            }

            return `
                <div class="tournament-container">
                    <div class="tournament-panel">
                        <div class="tournament-panel-header"></div>
                        <h2 class="cyberpunk glitched">Tournament Lobby</h2>
                        
                        <div id="practice-rule" class="tournament-status">
                            <p id="practice-rule" class="cyberpunk inverse">Status: Waiting for Players</p>
                            <p id="practice-rule" class="cyberpunk inverse">Players: ${playerCount}/${maxPlayers}</p>
                            ${playersNeeded > 0 ? `<p>Waiting for ${playersNeeded} more player${playersNeeded > 1 ? 's' : ''}...</p>` : ''}
                        </div>
                        
                        <div class="player-list">
                            ${playersHTML}
                        </div>
                        
                        <div class="tournament-actions">
                            <p class="joined-status">You've joined this tournament</p>
                            <button id="back-to-profile" class="cyberpunk red">Back to Profile</button>
                        </div>
                        
                        <div class="tournament-panel-footer"></div>
                    </div>
                </div>
                <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
            `;
        }
        catch (err) {
            // console.log(err);
        }
    }

    async setupEventListeners() {

        this.chat = await MainChatWindow.getChat();

        const openChatBtn = document.getElementById('open-chat-button');
        if (openChatBtn) {
            const newOpenChatBtn = openChatBtn.cloneNode(true);
            openChatBtn.parentNode.replaceChild(newOpenChatBtn, openChatBtn);
            
            newOpenChatBtn.addEventListener('click', () => {
                // console.log('%cTournamentWaitingView => Chat button clicked',  "color: red");
                if (this.chat) {
                    this.chat.openChatPopover();
                } else {
                    // console.log('Chat instance is null');
                }
            });
        } else {
            // console.log('open-chat-button not found');
        }
        
        const backButton = document.getElementById('back-to-profile');
        if (backButton) {
          backButton.addEventListener('click', () => {
            this.cleanup();
            navigateTo('/profile');
          });
        }
    }

    async cleanup() {
   
    }
}