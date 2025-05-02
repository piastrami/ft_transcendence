import AbstractView from "../../AbstractView.js";
import { handleFetchErrors } from "../../../functions/utils/HandleFetchErrors.js";
import { navigateTo } from "../../../index.js";
import { getUsername } from "../../../functions/utils/getUsername.js";
import { showCustomAlert } from "../../../functions/utils/customAlert.js";
import TournamentWaitingView from "./WaitingView.js";
import TournamentSemiFinalsView from "./SemiFinalsView.js";
import TournamentFinalsView from "./FinalsView.js";
import TournamentCompletedView from "./CompletedView.js";
import TournamentPoller from "../../../functions/game/tournamentPoller.js";
import { MainChatWindow } from "../../../functions/chat/mainChatWindow.js";
import { deletegamenotif } from "../../../functions/notification/utils/utils.js";
import { set_tourn_alias } from "../../../functions/game/gameAlias.js";

export default class JoinTournamentView extends AbstractView {
  constructor(tournamentID) {
    super();
    this.tournamentID = tournamentID;
    this.tournament = null;
    this.currentUser = null;
    this.players = [];
    this.hasJoined = false;
    this.originalBackground = null;
    this.isUserInGame = null;
    this.isLeavingIntentionally = null;
    this.tournamentTimeout = null;
    this.playerCount = null;
    this.poller = null;
    this.chat = null;
    this.div_app = document.getElementById('app');
  }

    async getHtml() {

        this.div_app.style.display = 'none';
        
         // Store the original background before changing it 
         if (!this.originalBackground) {
            const computedStyle = getComputedStyle(document.documentElement);
            this.originalBackground = computedStyle.backgroundImage;
        }

        document.documentElement.classList.add('tournament-background');
        document.body.classList.add('tournament-background');
        
        this.access = sessionStorage.getItem('access');
        // console.log('Access token: ', this.access);
        try {
            this.currentUser = await getUsername();
            this.tournament = await handleFetchErrors(`/pong/tournament/info/${this.tournamentID}/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.access}`
                },
            });
            this.players = this.tournament.players;

            // if player is not in the tournament, add them
            if (!this.players.some(player => player.user_profile && player.user_profile.user.username === this.currentUser) && this.tournament.status === 'waiting') {
                await this.addPlayerToTournament();
            }

            this.div_app.style.display = 'flex';

        }
        catch{
            // console.log('Error getting tournament');
            return;
        }

        // Determine tournament status and render appropriate view
        // console.log('Tournament status: ', this.tournament.status);
        switch (this.tournament.status) {
            case 'waiting':
                return this.renderWaitingView();
            case 'semifinals':
                return this.renderSemifinalsView();
            case 'finals':
                return this.renderFinalsView();
            case 'completed':
                return this.renderCompletedView();
            case 'interrupted':
                return this.renderInterruptedView();
            default:
                return this.renderWaitingView();
        }
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
              // console.log('%cJoinTournamentView => Chat button clicked',      "color: red");
              if (this.chat) {
                  this.chat.openChatPopover();
              } else {
                  // console.log('Chat instance is null');
              }
          });
      } else {
          // console.log('open-chat-button not found');
      }

        // Initialize the poller
        if (this.poller === null) {
          this.poller = new TournamentPoller(
            this.tournamentID, 
            await this.handleTournamentUpdate.bind(this)
          );
          this.poller.start();
      }
    
        // Join game buttons - to be redirected to 1v1 games
        const joinGameButtons = document.querySelectorAll('.join-game-btn');
        joinGameButtons.forEach(button => {
          if (button) {
            button.addEventListener('click', async () => {
              // console.log("Join game button clicked")
              const gameId = button.dataset.gameId;
              if (gameId) {
                this.setInfoClientSide(gameId);
                await this.cleanup();
                navigateTo(`/pong/${gameId}`);
              }
            });
          }
        });
        
        // Back to profile button
        const backButton = document.getElementById('back-to-profile');
        if (backButton) {
          backButton.addEventListener('click', async () => {
            await this.cleanup();
            navigateTo('/profile');
          });
        }
    }
    
    async handleTournamentUpdate(updatedTournament) {
        // Check if tournament status has changed
        if (updatedTournament.status !== this.tournament.status) {
          if (updatedTournament.status === 'interrupted') {
            this.poller.stop();
            if (this.tournament.creator.user.username !== this.currentUser) {
              await deletegamenotif(this.tournamentID);
            }
          }
          // console.log(`Tournament status updated from ${this.tournament.status} to ${updatedTournament.status}`);
          
          this.tournament = updatedTournament;
          
          this.refreshView();
          return;
        }

        this.tournament = updatedTournament;

        const finalGame = this.tournament.tournament_games.find(game => game.round === 'final');
        if (this.tournament.status === 'semifinals') {
            const semifinalGames = this.tournament.tournament_games.filter(game => game.round === 'semifinal');
            
            const allSemifinalsCompleted = semifinalGames.length === 2 && 
            semifinalGames.every(game => game.game.is_active === false && game.game.winner !== null);
            
            if (allSemifinalsCompleted) {
                if (!finalGame) {
                    // console.log('All semifinals completed, creating final game');
                    await this.changeTournamentStatus('finals');
                }
            }
        }
        
        if (this.tournament.status === 'finals') {
            if (finalGame?.game?.is_active === false && finalGame?.game?.winner !== null) {
                // console.log('Final game completed, setting tournament as completed');
                await this.changeTournamentStatus('completed');
            }
        } 

        // Update specific parts of the UI based on tournament status
        switch (this.tournament.status) {
        case 'waiting':
            this.updateWaitingView();
            break;
        case 'semifinals':
            this.updateSemifinalsView();
            break;
        case 'finals':
            await this.updateFinalsView();
            break;
        }
    }

    async refreshView() {
        // console.log('Refreshing view');
        document.querySelector("#app").innerHTML = await this.getHtml();
        await this.setupEventListeners();
    }

    async setInfoClientSide(gameID) {
        if (gameID) {
            let game = null;
            let player1 = null;
            let player2 = null;
            // console.log(this.tournament);
            // console.log(this.tournament.tournament_games);
            // console.log('Searching for game with ID: ', gameID);
            if (this.tournament && this.tournament.tournament_games) {
                game = this.tournament.tournament_games.find(tg => tg.game.game_id === gameID);
            }
            // console.log('Game found: ', game);
            if (game && game.alias1 && game.alias2) {
                // console.log("game.alias1: ", game.alias1);
                // console.log("game.alias2: ", game.alias2);
                if (this.tournament && this.tournament.players) {
                    player1 = game.alias1;
                    player2 = game.alias2;
                }
            }
            // console.log('Setting aliases in session storage', player1, player2);
            sessionStorage.setItem('tournament_game_aliases', JSON.stringify({
                player1: player1,
                player2: player2,
                tournamentId: this.tournament.tournament_id,
            }));
        }
    }

    async addPlayerToTournament() {
        // console.log(`Adding ${this.currentUser} to tournament`);
        /* All selected users being added to tournament while waiting for logic of accepting invite */

        const access = sessionStorage.getItem('access');
        this.alias = await set_tourn_alias(this.tournamentID);
        const playerAdded = await handleFetchErrors(`/pong/tournament/join/${this.tournamentID}/`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access}`
                },
                body: JSON.stringify({
                    alias: this.alias,
                })
            }
        );
        // console.log('Player added to tournament: ', playerAdded);
        this.hasJoined = true;
        await this.startTournamentTimeout();
    }

    async startTournamentTimeout() {
      this.tournamentTimeout = setTimeout(async () => {
          const playersCount = this.tournament.players.length;
  
          if (playersCount < 3) {
              await showCustomAlert("Tournament canceled due to insufficient players.");
              if (this.currentUser === this.tournament.players[0].user_profile.user.username) {
                await this.changeTournamentStatus('interrupted'); // ADD
              }
          }
      }, 180000); // 180 000 - 3 minutes
    }

    //VIEWS DEPENDING ON TOURNAMENT STATUS
    async renderWaitingView() {
        const waitingView = new TournamentWaitingView(this.currentUser, this.tournamentID, this.hasJoined);
        const html = await waitingView.getHtml();
        await waitingView.setupEventListeners();
        return html;
    }

    async renderSemifinalsView() {
        const semiFinalsView = new TournamentSemiFinalsView(this.tournament, this.isUserInGame, this.currentUser);
        const html = await semiFinalsView.getHtml();
        await semiFinalsView.setupEventListeners();
        return html;

    }

    async renderFinalsView() {
        const finalsView = new TournamentFinalsView(this.tournament, this.isUserInGame, this.currentUser);
        const html = await finalsView.getHtml();
        await finalsView.setupEventListeners();
        return html;
    }

    async renderCompletedView() {
        const completedView = new TournamentCompletedView(this.tournament, this.currentUser);
        const html = await completedView.getHtml();
        await completedView.setupEventListeners();
        return html;
    }

    async renderInterruptedView() {

      if (this.poller.isPolling) {
        this.poller.stop();
      }
      await deletegamenotif(this.tournamentID);
      return `
          <div class="tournament-container">
              <div class="tournament-panel">
                  <div class="tournament-panel-header"></div>
                  <h2 class="cyberpunk glitched">Tournament Interrupted</h2>
                  
                  <div class="tournament-status error">
                      <p class="cyberpunk inverse">Status: Tournament Interrupted</p>
                      <p>This tournament has been interrupted because a player left or timed out.</p>
                  </div>
                  
                  <div class="tournament-message">
                      <p>Unfortunately, this tournament cannot continue. Please return to your profile and join or create a new tournament.</p>
                  </div>
                  
                  <div class="tournament-panel-footer"></div>
              </div>
          </div>
          <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
      `;
    }

    // Methods to update specific parts of the UI without full refresh
    updateWaitingView() {
      const playerCount = this.tournament.players.length;
      const maxPlayers = this.tournament.max_players || 4;
      const playersNeeded = maxPlayers - playerCount;

      // Update player count display
      const playerCountElement = document.querySelector('.tournament-status p:nth-child(2)');
      if (playerCountElement) {
          playerCountElement.textContent = `Players: ${playerCount}/${maxPlayers}`;
      }

      // Update waiting message
      const waitingElement = document.querySelector('.tournament-status p:nth-child(3)');
      if (waitingElement) {
          waitingElement.textContent = playersNeeded > 0 ? 
          `Waiting for ${playersNeeded} more player${playersNeeded > 1 ? 's' : ''}...` : 
          'All players have joined!';
      }

      // Update player list
      this.updatePlayerList();
    }

    updatePlayerList() {
        const playerListElement = document.querySelector('.player-list');
        if (!playerListElement) return;
        
        // Clear existing player slots
        playerListElement.innerHTML = '';
        
        // Add updated player slots
        const maxPlayers = this.tournament.max_players || 4;
        for (let i = 0; i < maxPlayers; i++) {
          if (i < this.tournament.players.length) {
            const player = this.tournament.players[i];
            const username = player.user_profile.user.username;
            let alias = player.alias;
            if (username === this.currentUser) {
              alias += ' (You)';
            }
            if (alias === 'undefined (You)' || alias === 'undefined' || alias.trim() === '') {
              alias = username;
            }
            
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot filled';
            playerSlot.innerHTML = `
              <div class="player-avatar">${alias.charAt(0).toUpperCase()}</div>
              <span class="player-name">${alias}</span>
            `;
            playerListElement.appendChild(playerSlot);
          } else {
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot empty';
            playerSlot.innerHTML = `
              <div class="player-avatar">?</div>
              <span class="player-name">Waiting for player to join...</span>
            `;
            playerListElement.appendChild(playerSlot);
          }
        }
    }

    updateSemifinalsView() {
        // Update semifinal games status
        const semifinalGames = this.tournament.tournament_games.filter(game => game.round === 'semifinal');
        semifinalGames.forEach((game, index) => {
          const matchElement = document.querySelector(`.semifinals .tournament-match:nth-child(${index + 1})`);
          if (!matchElement) return;
          
          // Update game status
          if (game.game.is_active === false && game.game.winner !== null) {
            const statusElement = matchElement.querySelector('p, button');
            if (statusElement && !statusElement.classList.contains('match-completed')) {
              statusElement.outerHTML = `<p class="match-completed">Match Completed</p>`;
            }
          }
        });
      }

      async updateFinalsView() {
        // Update final game status
        const finalGame = this.tournament.tournament_games.find(game => game.round === 'final');
        if (finalGame) {
          const finalElement = document.querySelector('.finals .tournament-match');
          if (!finalElement) return;
          
          // Update game status
          if (finalGame.game.is_active === false && finalGame.game.winner !== null) {
            const statusElement = finalElement.querySelector('p, button');
            if (statusElement && !statusElement.classList.contains('match-completed')) {
              statusElement.outerHTML = `<p class="match-completed">Match Completed</p>`;
            }
          }
        }
    }

    async changeTournamentStatus(status) {
      try {
        const response = await handleFetchErrors(`/pong/tournament/update/${this.tournamentID}/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.access}`
          },
          body: JSON.stringify({
              status: status,
          }),
        });
        
          // console.log(`Game set as ${status}:`, response);
      } 
      catch (error) {
          // console.log(`Error setting game as ${status}:`, error);
      }
    }

    async cleanup() {
      if (this.poller) {
        // console.log('Stopping poller');
        this.poller.stop();
        this.poller = null;
      }
        
      // Restore original background
      document.body.classList.remove('tournament-background');
      document.documentElement.classList.remove('tournament-background');
      if (this.originalBackground) {
        document.documentElement.style.backgroundImage = this.originalBackground;
        document.documentElement.style.backgroundSize = 'cover';
      }
    }
}
