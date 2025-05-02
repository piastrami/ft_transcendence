import AbstractView from "../AbstractView.js";
import PongGame from "../../functions/game/pongGame.js";
import { isAuthenticated } from "../../functions/authentication/isAuthenticated.js";
import { handleFetchErrors } from "../../functions/utils/HandleFetchErrors.js";
import { navigateTo } from "../../index.js";
import { getUsername } from "../../functions/utils/getUsername.js";
import { showCustomAlert } from "../../functions/utils/customAlert.js";
import { showCustomConfirm } from "../../functions/utils/customConfirm.js";
import { MainChatWindow } from "../../functions/chat/mainChatWindow.js";
import { EventManager } from "../../functions/utils/eventManager.js";
import { getGameId } from "../../functions/game/getGameId.js";
import { gameNotif } from "../../functions/notification/game/gameInvitation.js";
import { updateGameActivity } from "../../functions/game/updatePlayerScores.js";
import { deletegamenotif } from "../../functions/notification/utils/utils.js";

export default class CompetitiveMatchView extends AbstractView {

    constructor(gameID) {
        super();
        this.gameDB = null;
        this.gameID = gameID;
        this.currentUser = null;
        this.pongGame = null;
        this.chat = null;
        this.eventManager = new EventManager();
        this.otherUser = null;
        this.currentPlayer = null;
        this.otherPlayer = null;
        this.isTournamentGame = false;
        this.gameIsOver = false;
        this.access = null;
        this.tournamentData = null;
        this.dataReady = false;
        this.init();
    }

    async init() {
        try {
            const pongCanvas = document.getElementById('pong-canvas');
            if (pongCanvas && pongCanvas.style.visibility !== 'hidden') {
                pongCanvas.style.visibility = 'hidden';
            }
            this.access = sessionStorage.getItem('access');
            this.currentUser = await getUsername();
            this.gameDB = await handleFetchErrors(`/pong/game_session/${this.gameID}/`, 
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.access}`,
                    },
                }       
            )
            if (this.gameDB.status === 'error') {
                // console.log(this.gameDB.status);
                throw this.gameDB.message;
            }
            // console.log(`this.gameDB.mode is : `, this.gameDB.mode);
            if (this.gameDB.mode === "Tournament") {
                // console.log("Fetching tournament details");
                this.isTournamentGame = true;
                await this.getTournamentDetails();
                if (this.tournamentData && this.tournamentData.status !== 'error') {
                    // console.log(`%cTournament data fetched successfully`);
                }
            }
            if (this.gameDB.player1.user.username === this.currentUser) {
                this.otherUser = this.gameDB.player2.user.username;
                this.currentPlayer = 'player1';
                this.otherPlayer = 'player2';
            }
            else {
                this.otherUser = this.gameDB.player1.user.username;
                this.currentPlayer = 'player2';
                this.otherPlayer = 'player1';
            }
            this.dataReady = true;
            if (this.gameDB && this.gameDB.is_active === false && this.gameDB.winner !== null) { 
                this.gameIsOver = true;
                this.game_is_over();
                return ;
            }
            // console.log("Creating pong game with mode : ", this.gameDB.mode);
            this.pongGame = new PongGame('pong-canvas', "remote", this.gameID, null, null, this.tournamentData);
        }
        catch (error) {
            // console.log("Error getting game from DB ", error);
            navigateTo('/profile');
            return ;
        }
    }

    async getHtml() {
        return `
                <canvas id="pong-canvas" width="800" height="600"></canvas>

                <div id="waiting-screen" class="waiting-screen">
                    <h2>Waiting for Player 2 to join...</h2>
                    <div class="waiting-gif" alt="loading"></div>
                </div>
                <div id="game-over-panel" class="game-over-panel">
                    <h2>Game Over!</h2>
                    <h3 id="winner-text"></h3>
                    <div id="final-scores"></div>
                    <div class="game-over-buttons">
                        <button id="play-again-btn" class="cyberpunk green">Play Again</button>
                        <button id="profile-btn" class="cyberpunk blue">Back to Profile</button>
                    </div>
                </div>
            <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
                `;
    }

    async setupEventListeners() {

        this.chat = await MainChatWindow.getChat();

        const openChatBtn = document.getElementById('open-chat-button');
        if (openChatBtn) {
            const newOpenChatBtn = openChatBtn.cloneNode(true);
            openChatBtn.parentNode.replaceChild(newOpenChatBtn, openChatBtn);
            this.eventManager.addEventListener(newOpenChatBtn, 'click', this.handleChatButtonClick, this);
        } else {
            // console.log('open-chat-button not found');
        }
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            this.eventManager.addEventListener(profileBtn, 'click', this.handleProfileButtonClick, this);
        } 
        else {
            // console.log('profile-btn not found');
        }
    } 
    
    handleChatButtonClick() {
        // console.log('%cCompetitiveMatchView=> Chat button clicked',  "color: red");
        if (this.chat) {
            this.chat.openChatPopover();
        } else {
            // console.log('Chat instance is null');
        }
    }

    handleProfileButtonClick() {
        const gameOverPanel = document.getElementById('game-over-panel');
        if (gameOverPanel) { 
            gameOverPanel.style.display = 'none';
        }
        const aliases = sessionStorage.getItem('tournament_game_aliases');
        if (aliases) {
            sessionStorage.removeItem('tournament_game_aliases');
        }
        navigateTo('/profile');
    }

    handleBeforeUnload(event) {
        if (this.gameIsOver || !location.pathname.includes('/pong/')) {
            return;
        }
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0 && navEntries[0].type === 'reload') {
            // console.log("This is a refresh, modern browser");
            return; // This is a refresh, don't show warning
        }
        
        if (performance.navigation && performance.navigation.type === 1) {
            // console.log("This is a refresh, legacy browser");
            return; // This is a refresh, don't show warning (legacy method)
        }
        
        event.preventDefault();
        event.returnValue = "Leaving will forfeit the game. Are you sure?";
        return event.returnValue; // For older browsers
    }

    game_is_over() {
        const playAgainBtn = document.getElementById('play-again-btn');
        const profileBtn = document.getElementById('profile-btn');
        const canvas = document.getElementById('pong-canvas');
        if (canvas) {
            canvas.style.display = 'none';
        }
        const waitingScreen = document.getElementById('waiting-screen');
        if (waitingScreen) {
            waitingScreen.style.display = 'none';
        }
        const gameOverPanel = document.getElementById('game-over-panel');
        const winnerText = document.getElementById('winner-text');
        const finalScores = document.getElementById('final-scores');
        if (gameOverPanel && winnerText && finalScores && playAgainBtn && profileBtn) {
            winnerText.textContent = `Winner: ${this.gameDB.winner.user.username}`;
            finalScores.textContent = `
                ${this.gameDB.player1.user.username}: ${this.gameDB.player1_score} - ${this.gameDB.player2.user.username}: ${this.gameDB.player2_score}
                `;
            if (!this.isTournamentGame && playAgainBtn) {
                playAgainBtn.textContent = "Play Again";
                profileBtn.style.display = 'block';
                playAgainBtn.onclick = async () => {
                    try {
                        const players = [this.gameDB.player1.user.username, this.gameDB.player2.user.username];
                        const new_gameID = await getGameId("1vs1", players);
                        if (this.currentUser === players[0])
                            this.otherUser = players[1];
                        else
                            this.otherUser = players[0];
                        // console.log(`this.otherUser is : ${this.otherUser}`);
                        await gameNotif(new_gameID, this.otherUser, "pong");
                        const playAgainURL = `/pong/${new_gameID}`;
                        navigateTo(playAgainURL);
                        return;
                    }
                    catch (error) {
                        await showCustomAlert("Something went wrong, maybe next time!");
                        navigateTo('/profile');
                        return;
                    }
                }
            }

            if (this.isTournamentGame && playAgainBtn && profileBtn) {
                // console.log("tournament game button handler")
                playAgainBtn.textContent = "Return to tournament";
                profileBtn.style.display = 'none';
                let winnerAlias;
                if (this.gameDB.winner.id === this.gameDB.player1.id) {
                    winnerAlias = this.tournamentData.tournament_game.alias1;
                } else {
                    winnerAlias = this.tournamentData.tournament_game.alias2;
                }
                winnerText.textContent = `Winner: ${winnerAlias}`
                finalScores.textContent = `
                    ${this.tournamentData.tournament_game.alias1}: ${this.gameDB.player1_score} - ${this.tournamentData.tournament_game.alias2}: ${this.gameDB.player2_score}
                    `;
                    playAgainBtn.onclick = () => {
                        // console.log(this.tournamentData);
                        navigateTo(`/tournament/${this.tournamentData.tournament.tournament_id}`);
                        if (gameOverPanel) {
                            gameOverPanel.style.display = 'none';
                        }
                        return;
                    }
            }
            gameOverPanel.style.display = 'block';
        }
    }

    async showForfeitWarning() {
        this.gameDB = await handleFetchErrors(`/pong/game_session/${this.gameID}/`, 
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.access}`,
                },
            }       
        )
        // console.log(`this.gameDB: `, this.gameDB);
        if (!this.gameDB || (this.gameDB.is_active === false && this.gameDB.winner !== null)) {
            return true;
        }
        if (this.gameDB !== null && this.gameDB.is_active === true) {
            const leaveGame = await showCustomConfirm("Leaving so soon? If you leave now, you forfeit this game.", 'Back to game', 'Leave game', false);
            if (leaveGame === true) {
                if (this.currentPlayer === 'player1') {
                    await updateGameActivity(this.currentUser, this.gameID, false, this.pongGame.state.score.left, 5);
                }
                else {
                    await updateGameActivity(this.currentUser, this.gameID, false, 5, this.pongGame.state.score.right);
                }
                this.pongGame.wss.send('stop_game');
                this.pongGame.interrupted = true;
            }
            return leaveGame;
        }
    }

    async getTournamentDetails() {
        this.tournamentData = await handleFetchErrors (`/pong/game/get_tournament/${this.gameID}/`, 
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.access}`,
                },
            }
        );
    }

    async cleanup() {
        // console.log("Cleaning up CompetitiveMatchView");
        this.eventManager.removeAll();

        const gameOverPanel = document.getElementById('game-over-panel');
        if (gameOverPanel) {
            gameOverPanel.remove();
        }
        const canvas = document.getElementById('pong-canvas');
        if (canvas) {
            // console.log("Canvas removed");
            canvas.remove();
        }
        const waitingScreen = document.getElementById('waiting-screen');
        if (waitingScreen) {
            // console.log("Waiting screen removed");
            waitingScreen.remove();
        }

        if (this.pongGame && this.pongGame.cleanup && typeof this.pongGame.cleanup === 'function') {
            this.pongGame.cleanup();
        }
        this.pongGame = null;
    }
}
