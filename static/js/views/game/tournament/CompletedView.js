import AbstractView from '../../AbstractView.js';
import { navigateTo } from "../../../index.js";
import { MainChatWindow } from "../../../functions/chat/mainChatWindow.js";

export default class TournamentCompletedView extends AbstractView {
    constructor(tournament, currentUser) {
        super();
        this.chat = null;
        this.tournament = tournament;
        // console.log("Tournament data: ", this.tournament);
        this.currentUser = currentUser;
        this.winner = this.determineWinner();
        // console.log("Winner is: ", this.winner);
        this.chat = null;
    }
    
    determineWinner() {
        const winnerProfile = this.tournament.tournament_games.find(game => game.round === 'final').game.winner;
        
        const winnerPlayer = this.tournament.players.find(player => player.user_profile.user.username === winnerProfile.user.username);
        
        return winnerPlayer ? winnerPlayer.alias : winnerProfile.username;
    }
    
    async getHtml() {
        // Get semifinal and final games for the bracket display
        const semifinalGames = this.tournament.tournament_games.filter(game => game.round === 'semifinal');
        const finalGame = this.tournament.tournament_games.find(game => game.round === 'final');
        
        // Generate HTML for semifinals
        let semifinalsHtml = '';
        semifinalGames.forEach((game, index) => {
            const player1 = game.alias1 || 'TBD';
            const player2 = game.alias2 || 'TBD';
            const winner = game.game.winner ? 
                (game.game.winner.user.username === game.game.player1.user.username ? player1 : player2) : null;
                
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
        
        // Generate HTML for final
        let finalHtml = '';
        if (finalGame) {
            const player1 = finalGame.alias1 || 'TBD';
            const player2 = finalGame.alias2 || 'TBD';
            const winner = finalGame.game.winner ? 
                (finalGame.game.winner.user.username === finalGame.game.player1.user.username ? player1 : player2) : null;
                
            finalHtml = `
                <div class="tournament-match completed">
                    <div class="match-header">Final</div>
                    <div class="match-players">
                        <div class="match-player ${winner === player1 ? 'winner' : ''}">${player1}</div>
                        <div class="match-vs">VS</div>
                        <div class="match-player ${winner === player2 ? 'winner' : ''}">${player2}</div>
                    </div>
                    <div class="match-result">Winner: ${winner}</div>
                </div>
            `;
        }
        
        // Check if current user is the winner
        const isUserWinner = this.winner && this.tournament.players.some(
            player => player.user_profile.user.username === this.currentUser && player.alias === this.winner
        );
        
        return `
        <div class="celebration-gif"></div>
            <div class="tournament-container">
                <div id="tournament-rules" class="tournament-panel wide">
                    <div class="tournament-panel-header"></div>
                    <h2 class="cyberpunk glitched">Tournament Completed</h2>
                    
                    <div class="tournament-winner-announcement">
                            <h3 id="winner-title" class="cyberpunk">${isUserWinner ? 'You are the Champion!' : 'Tournament Champion :'}</h3>
                            <div class="winner-name">${this.winner}</div>
                    </div>
                    
                    <div class="tournament-bracket">
                        <div class="semifinals">
                            ${semifinalsHtml}
                        </div>
                        <div class="finals">
                            ${finalHtml}
                        </div>
                    </div>
                    
                    <div class="tournament-panel-footer"></div>
                </div>
            </div>
            <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
        `;
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
                // console.log('%cTournamentCompletedView => Chat button clicked',     "color: red");
                if (this.chat) {
                    this.chat.openChatPopover();
                } 
            });
        } 
    }
    
}