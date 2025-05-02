import TournamentMatchView from './MatchView.js';

export default class TournamentSemiFinalsView extends TournamentMatchView {
    constructor (tournament, isUserInGame, currentUser) {
        super(tournament, isUserInGame, currentUser);
        this.tournament = tournament;
        this.isUserInGame = isUserInGame;
        this.currentUser = currentUser;
        this.players = tournament.players;
        this.semifinalGames = [];
        this.semifinal1 = null;
        this.semifinal2 = null;
        this.finalsPlayers = ["TBD", "TBD"];
    }

    async getHtml() {
        this.semifinalGames = this.tournament.tournament_games.filter(game => game.round === 'semifinal');
        // console.log('Semifinal games: ', this.semifinalGames);
        this.semifinal1 = this.semifinalGames[0];
        this.semifinal2 = this.semifinalGames[1];

        let semifinalsHTML = '';
        let playerIndex = 0;
        this.semifinalGames.forEach((game, index) => {
            if (index === 0) {
                playerIndex = index;
            }
            else {
                playerIndex += 2;
            }
            const player1 = game.game.player1 ? this.players[playerIndex].alias : 'TBD';
            const player2 = game.game.player2 ? this.players[playerIndex + 1].alias : 'TBD';
            const gameID = game.game.game_id;
            this.isUserInGame = (game.game.player1 && game.game.player1.user.username === this.currentUser) || (game.game.player2 && game.game.player2.user.username === this.currentUser);
            
            let statusHTML = '';

            // console.log('this.isGameInProgress:', this.isGameInProgress);
            // console.log('this.gameCompleted:', this.gameCompleted);
            if (this.gameCompleted[`semifinal${index + 1}`]) {
                statusHTML = `<p class="match-completed">Match Completed</p>`;
            } else if (this.isUserInGame) {
                statusHTML = `<button class="join-game-btn cyberpunk green" data-game-id="${gameID}">Join Your Match</button>`;
            }
            semifinalsHTML += `
                    <div class="tournament-match ${this.isUserInGame ? 'your-match' : ''}">
                        <div class="match-header">Semifinal ${index + 1}</div>
                        <div class="match-players">
                            <div class="match-player">${player1}</div>
                            <div class="match-vs">VS</div>
                            <div class="match-player">${player2}</div>
                        </div>
                        ${statusHTML}
                    </div>
                `;
        });

        return `
        <div class="tournament-container">
                <div id="tournament-rules"  class="tournament-panel wide">
                    <div class="tournament-panel-header"></div>
                    <h2 class="cyberpunk glitched">Tournament Semifinals</h2>
                    
                    <div class="tournament-status">
                        <p id="tournament-status" class="cyberpunk inverse">Status: Semifinals in Progress</p>
                    </div>
                    
                    <div class="tournament-bracket">
                        <div class="semifinals">
                            ${semifinalsHTML}
                        </div>
                        <div class="finals-placeholder">
                            <div class="tournament-match disabled">
                                <div class="match-header">Final</div>
                                <div class="match-players">
                                    <div class="match-player">${this.finalsPlayers[0]}</div>
                                    <div class="match-vs">VS</div>
                                    <div class="match-player">${this.finalsPlayers[1]}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tournament-instructions">
                        ${this.isUserInGame ? 
                            `<p class="highlight">Your match is highlighted. Click "Join Your Match" to play!</p>` : 
                            `<p>You are spectating this tournament. Wait for the semifinals to complete.</p>`
                        }
                    </div>
                    <div class="tournament-panel-footer"></div>
                </div>
            </div>
            <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
        `;

    }

    updateInitialGameStatus() {
        this.semifinalGames.forEach((game, index) => {
          const semifinalKey = `semifinal${index + 1}`;
          this.isGameInProgress[semifinalKey] = game.game.is_active === true;
          this.gameCompleted[semifinalKey] = game.game.is_active === false && game.game.winner !== null;
        });
    }

    async setupEventListeners() {
        super.setupEventListeners();
    }

    async cleanup() {

    }
}
