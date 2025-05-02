import AbstractView from '../../AbstractView.js';
import { navigateTo } from "../../../index.js";
import { MainChatWindow } from "../../../functions/chat/mainChatWindow.js";

export default class TournamentMatchView extends AbstractView {
    constructor(tournament, isUserInGame, currentUser) {
      super();
      this.tournament = tournament;
      this.isUserInGame = isUserInGame;
      this.currentUser = currentUser;
      this.players = tournament.players;
      this.isGameInProgress = {
        semifinal1: false,
        semifinal2: false,
        final: false,
      };
      this.gameCompleted = {
        semifinal1: false,
        semifinal2: false,
        final: false,
      };
      this.chat = null;
    }

    // Common functionality for both semifinal and final views
    async setupEventListeners() {
        
        this.chat = await MainChatWindow.getChat();

        const openChatBtn = document.getElementById('open-chat-button');
        if (openChatBtn) {
            const newOpenChatBtn = openChatBtn.cloneNode(true);
            openChatBtn.parentNode.replaceChild(newOpenChatBtn, openChatBtn);
            
            newOpenChatBtn.addEventListener('click', () => {
                // console.log('%cTournamentMatchView => Chat button clicked',     "color: red");
                if (this.chat) {
                    this.chat.openChatPopover();
                } else {
                    // console.log('Chat instance is null');
                }
            });
        } else {
            // console.log('open-chat-button not found');
        }

        // Join game buttons - to be redirected to 1v1 games
        const joinGameButtons = document.querySelectorAll('.join-game-btn');
        joinGameButtons.forEach(button => {
          if (button) {
            button.addEventListener('click', async () => {
              // console.log("Join game button clicked");
              const gameId = button.dataset.gameId;
              if (gameId) {
                this.setInfoClientSide(gameId);
                navigateTo(`/pong/${gameId}`);
              }
            });
          }
        });
    }
    
    async setInfoClientSide(gameID) {
        if (gameID) {
            let game = null;
            let player1 = null;
            let player2 = null;
            
            // console.log('Searching for game with ID: ', gameID);
            if (this.tournament && this.tournament.tournament_games) {
                game = this.tournament.tournament_games.find(tg => tg.game.game_id === gameID);
            }
            
            // console.log('Game found: ', game);
            if (game) {
                // Try to get aliases first
                if (game.alias1 && game.alias2) {
                    player1 = game.alias1;
                    player2 = game.alias2;
                } 
                else if (game.game.player1 && game.game.player2) {
                    const player1Info = this.players.find(p => 
                        p.user_profile && game.game.player1.id === p.user_profile.id);
                    const player2Info = this.players.find(p => 
                        p.user_profile && game.game.player2.id === p.user_profile.id);
                    
                    player1 = player1Info ? player1Info.alias : 'Player 1';
                    player2 = player2Info ? player2Info.alias : 'Player 2';
                }
            }
            sessionStorage.setItem('tournament_game_aliases', JSON.stringify({
                player1: player1,
                player2: player2,
                tournamentId: this.tournament.tournament_id,
            }));
        }
    }

    updateGameStatus(updatedTournament) {
        if (!updatedTournament || !updatedTournament.tournament_games) return;
        
        const updatedGames = updatedTournament.tournament_games;
        
        for (const game of updatedGames) {
        if (game.round === 'semifinal') {
            const semifinalIndex = game.order === 1 ? 'semifinal1' : 'semifinal2';
            
            this.isGameInProgress[semifinalIndex] = game.game.is_active === true;
            this.gameCompleted[semifinalIndex] = game.game.is_active === false && game.game.winner !== null;
            
            const matchElement = document.querySelector(`.semifinals .tournament-match:nth-child(${game.order})`);
            if (matchElement) {
            this.updateMatchUI(matchElement, game, semifinalIndex);
            }
        } else if (game.round === 'final') {
            this.isGameInProgress.final = game.game.is_active === true;
            this.gameCompleted.final = game.game.is_active === false && game.game.winner !== null;
            
            const finalElement = document.querySelector('.finals .tournament-match');
            if (finalElement) {
            this.updateMatchUI(finalElement, game, 'final');
            }
        }
        }
    }
    
    updateMatchUI(matchElement, game, gameType) {
        const isUserInThisGame = (game.game.player1 && game.game.player1.user.username === this.currentUser) || 
                                (game.game.player2 && game.game.player2.user.username === this.currentUser);
        
        if (isUserInThisGame) {
          matchElement.classList.add('your-match');
        } else {
          matchElement.classList.remove('your-match');
        }
        
        let statusHTML = '';
        const gameID = game.game.game_id;
        
        if (this.gameCompleted[gameType]) {
          statusHTML = `<p class="match-completed">Match Completed</p>`;
        } else if (isUserInThisGame) {
          statusHTML = `<button class="join-game-btn cyberpunk green" data-game-id="${gameID}">Join Your Match</button>`;
        }
        
        const statusElement = matchElement.querySelector('p:last-child, button');
        if (statusElement) {
          statusElement.outerHTML = statusHTML;
        }
        
        if (statusHTML.includes('join-game-btn')) {
          const newButton = matchElement.querySelector('.join-game-btn');
          if (newButton) {
            newButton.addEventListener('click', async () => {
              // console.log("Join game button clicked");
              const gameId = newButton.dataset.gameId;
              if (gameId) {
                this.setInfoClientSide(gameId);
                navigateTo(`/pong/${gameId}`);
              }
            });
          }
        }
      }
    
    async cleanup() {
    }
}