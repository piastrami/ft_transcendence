import TournamentMatchView from './MatchView.js';

export default class TournamentFinalsView extends TournamentMatchView {
    constructor(tournament, isUserInGame, currentUser) {
      super(tournament, isUserInGame, currentUser);
      this.tournament = tournament;
      this.isUserInGame = isUserInGame;
      this.currentUser = currentUser;
      this.players = tournament.players;
    }
  
    async getHtml() {
      // Get semifinal and final games
      const semifinalGames = this.tournament.tournament_games.filter(game => game.round === 'semifinal');
      const finalGame = this.tournament.tournament_games.find(game => game.round === 'final');
  
      // Update game status based on current data
      this.updateInitialGameStatus(semifinalGames, finalGame);
  
      let semifinalsHtml = '';
      semifinalGames.forEach((game, index) => {
        const player1 = game.alias1 || 'TBD';
        const player2 = game.alias2 || 'TBD';
        const winner = game.game.winner ? (game.game.winner.user.username === game.game.player1.user.username ? player1 : player2) : null;
  
        semifinalsHtml += `
          <div class="tournament-match completed">
            <div class="match-header">Semifinal ${index + 1}</div>
            <div class="match-players">
              <div class="match-player ${winner === player1 ? 'winner' : ''}">${player1}</div>
              <div class="match-vs">VS</div>
              <div class="match-player ${winner === player2 ? 'winner' : ''}">${player2}</div>
            </div>
            <div class="match-result">
              ${winner ? `Winner: ${winner}` : 'In Progress'}
            </div>
          </div>
        `;
      });
  
      let finalHtml = '';
      if (finalGame) {
        const player1 = finalGame.game.player1 ? finalGame.alias1 : 'TBD';
        const player2 = finalGame.game.player2 ? finalGame.alias2 : 'TBD';
        const gameId = finalGame.game.game_id;
        const isUserInFinal = (finalGame.game.player1 && finalGame.game.player1.user.username === this.currentUser) ||
                              (finalGame.game.player2 && finalGame.game.player2.user.username === this.currentUser);
  
        let statusHTML = '';
        if (this.gameCompleted.final) {
          const winner = finalGame.game.winner ? (finalGame.game.winner.user.username === finalGame.game.player1.user.username ? player1 : player2) : null;
          statusHTML = `<div class="match-result" data-winner="${winner ? winner : ''}">Winner: ${winner}</div>`;
        } else if (isUserInFinal) {
          statusHTML = `<button class="join-game-btn cyberpunk green" data-game-id="${gameId}">Join Final Match</button>`;
        }
  
        finalHtml = `
          <div class="tournament-match ${isUserInFinal ? 'your-match' : ''}">
            <div class="match-header">Final</div>
            <div class="match-players">
              <div class="match-player">${player1}</div>
              <div class="match-vs">VS</div>
              <div class="match-player">${player2}</div>
            </div>
            ${statusHTML}
          </div>
        `;
      }
  
      return `
        <div class="tournament-container finals-view">
          <div id="tournament-rules" class="tournament-panel wide">
            <div class="tournament-panel-header"></div>
            <h2 class="cyberpunk glitched">Tournament Finals</h2>
            <div class="tournament-status">
              <p id="tournament-status" class="cyberpunk inverse">Status: Finals in Progress</p>
            </div>
            <div class="tournament-bracket">
              <div class="semifinals">
                ${semifinalsHtml}
              </div>
              <div class="finals">
                ${finalHtml}
              </div>
            </div>
            <div class="tournament-instructions">
              ${this.isPlayerInFinal() ?
                `<p class="highlight">Your final match is ready! Click "Join Final Match" to play!</p>` :
                `<p>You are spectating the finals. Wait for the tournament to complete.</p>`
              }
            </div>
            <div class="tournament-panel-footer"></div>
          </div>
        </div>
        <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
      `;
    }
  
    updateInitialGameStatus(semifinalGames, finalGame) {
      // Set initial game status for semifinals
      semifinalGames.forEach((game, index) => {
        const semifinalKey = `semifinal${index + 1}`;
        this.isGameInProgress[semifinalKey] = game.game.is_active === true;
        this.gameCompleted[semifinalKey] = game.game.is_active === false && game.game.winner !== null;
      });
  
      // Set initial game status for final
      if (finalGame) {
        this.isGameInProgress.final = finalGame.game.is_active === true;
        this.gameCompleted.final = finalGame.game.is_active === false && finalGame.game.winner !== null;
        // console.log('Final game completed:', this.gameCompleted.final);
      }
    }
  
    isPlayerInFinal() {
      const finalGame = this.tournament.tournament_games.find(game => game.round === 'final');
      if (!finalGame) return false;
      
      return (
        finalGame.game.player1 && finalGame.game.player1.user.username === this.currentUser) ||
        (finalGame.game.player2 && finalGame.game.player2.user.username === this.currentUser
        );
    }
  
    async setupEventListeners() {
      await super.setupEventListeners();
    }
  }