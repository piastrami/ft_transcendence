import AbstractView from "../AbstractView.js";
import PongGame from "../../functions/game/pongGame.js";
import { navigateTo } from "../../index.js";
import { MainChatWindow } from "../../functions/chat/mainChatWindow.js";
import { EventManager } from "../../functions/utils/eventManager.js";
import { generatePracticeID } from "../../functions/game/generatePracticeID.js";

export default class EachPracticeMatchView extends AbstractView {

    constructor(gameID) {
        super();
        this.gameID = gameID;
        this.user = null;
        this.pongGame = null;
        this.chat = null;
        this.eventManager = new EventManager();
        this.chatButtonHandler = null;
        this.playAgainHandler = null;
        this.profileBtnHandler = null;

    }
    
    async getHtml() {
        return `
            <canvas id="pong-canvas" width="800" height="600"></canvas>
            <div id="game-over-panel" class="game-over-panel">
                <h2>Game Over!</h2>
                <h3 id="winner-text"></h3>
                <div id="final-scores"></div>
                <div class="game-over-buttons">
                    <button id="play-again-btn">Play Again</button>
                    <button id="profile-btn">Back to Profile</button>
                </div>
            </div>
            </div>
            <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
                `;
    }

    async setupEventListeners() {
        //Chat
        this.chat = await MainChatWindow.getChat();

        const openChatBtn = document.getElementById('open-chat-button');
        if (openChatBtn) {
            const newOpenChatBtn = openChatBtn.cloneNode(true);
            openChatBtn.parentNode.replaceChild(newOpenChatBtn, openChatBtn);
            
            this.chatButtonHandler = () => {
                // console.log('%cEachPracticeMatchView=> Chat button clicked', "color: red");
                if (this.chat) {
                    this.chat.openChatPopover();
                } else {
                    // console.log('Chat instance is null');
                }
            }
            this.eventManager.addEventListener(newOpenChatBtn, 'click', this.chatButtonHandler, this);
        } else {
            // console.log('open-chat-button not found');
        }
    
        // Play again button behaviour in practice mode
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            this.playAgainHandler = () => { 
                const gameOverPanel = document.getElementById('game-over-panel');
                if (gameOverPanel) { 
                    gameOverPanel.style.display = 'none';
                }
                const gameId = generatePracticeID();
                const playAgainUrl = `/pong/practice/${gameId}`;
                navigateTo(playAgainUrl);
            }
            this.eventManager.addEventListener(playAgainBtn, 'click', this.playAgainHandler, this.pongGame);
        }

        // Profile button behaviour
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            this.profileBtnHandler = () => {
                const gameOverPanel = document.getElementById('game-over-panel');
                if (gameOverPanel) { 
                    gameOverPanel.style.display = 'none';
                }
                navigateTo('/profile');
            }
            this.eventManager.addEventListener(profileBtn, 'click', this.profileBtnHandler, this.pongGame);
        }
        
        try {
            const aliasesJson = sessionStorage.getItem('practice_game_aliases');
            this.aliases = aliasesJson ? JSON.parse(aliasesJson) : null;
            
            this.pongGame = new PongGame('pong-canvas', "practice", this.gameID, this.aliases);
        }
        catch (error) {
            // console.log("Error starting game ", error);
        }
    } 
    
    async checkInterruption() {
        if (this.pongGame && this.pongGame.state.is_running) {
            this.pongGame.state.is_running = false;
            // console.log('Game interrupted in practice');
        }
    }

    async cleanup() {
        this.eventManager.removeAll();
        //Remove game over panel
        const gameOverPanel = document.getElementById('game-over-panel');
        if (gameOverPanel) {
            gameOverPanel.remove();
        }
        //Cleanup canvas
        const canvas = document.getElementById('pong-canvas');
        if (canvas) {
            canvas.remove();
        }
        //Remove chat button
        const chatBtn = document.getElementById('open-chat-button');
        if (chatBtn) {
            chatBtn.remove();
        }

        //Cleanup practice game
        if (this.pongGame && typeof this.pongGame.cleanup === 'function') {
            this.pongGame.cleanup();
        }
        this.pongGame = null;
        
        this.chat = null;
        this.aliases = null;
        this.user = null;
        
    }
}
