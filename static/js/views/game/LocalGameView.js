import AbstractView from "../AbstractView.js";
import { navigateTo } from "../../index.js";
import { generatePracticeID } from "../../functions/game/generatePracticeID.js";
import { set_player_aliases } from "../../functions/game/gameAlias.js";
import { MainChatWindow } from "../../functions/chat/mainChatWindow.js";
import { EventManager } from "../../functions/utils/eventManager.js";

export default class LocalGameView extends AbstractView {

    constructor() {
        super();
        this.chat = null;
        this.aliases = null;
        this.eventManager = new EventManager();
        this.chatButtonHandler = null;
        this.startBtnHandler = null;
        this.enterKeyHandler = null; 
    }
    
    // This method should only return HTML
    async getHtml() {
        return `
            <div id="game-info-container" class="cyberpunk-container" style="display: none;">
                <h3 id="practice-title" class="cyberpunk glitched">PRACTICE MODE</h3>
                <div id="info-message" class="cyberpunk-message">
                </div>
                <button id="start-btn" class="cyberpunk">
                START
                <span aria-hidden="true" class="cybr-btn__glitch">START</span>
                <span aria-hidden="true" class="cybr-btn__tag">R-25</span>
                </button>
            </div>
            <canvas id="pong-canvas" width="800" height="600" style="display: none;"></canvas>
            <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
        `;
    }

    // Méthode pour démarrer le jeu
    startGame() {
        // console.log('%cLocalGameView=> Starting the game', "color: red");
        const game_id = generatePracticeID();
        navigateTo(`/pong/practice/${game_id}`);
    }

    // This method should handle data fetching and event binding
    async setupEventListeners() {
        //Chat
        this.chat = await MainChatWindow.getChat();

        const openChatBtn = document.getElementById('open-chat-button');
        if (openChatBtn) {
            const newOpenChatBtn = openChatBtn.cloneNode(true);
            openChatBtn.parentNode.replaceChild(newOpenChatBtn, openChatBtn);
            
            this.chatButtonHandler = () => {
                // console.log('%cLocalGameView=> Chat button clicked', "color: red");
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

        // Set up event listener for the button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) { 
            this.startBtnHandler = async () => { 
                // console.log('%cLocalGameView=> Start button clicked', "color: red");
                this.startGame();
            }
            this.eventManager.addEventListener(startBtn, 'click', this.startBtnHandler, this);
        }
        
        // Ajout de l'event listener pour la touche Entrée
        this.enterKeyHandler = (event) => {

            if (event.key === 'Enter' && this.alias && this.aliases.length === 2) {
                // console.log('%cLocalGameView=> Enter key pressed', "color: red");
                this.startGame();
            }
        };
        this.eventManager.addEventListener(document, 'keydown', this.enterKeyHandler, this);
        
        this.aliases = await set_player_aliases();
        if (this.aliases === null) {
            // console.log('Practice cancelled by user');
            navigateTo('/profile');
            return;
        }
        const gameInfoContainer = document.getElementById('game-info-container');
        gameInfoContainer.style.display = 'block';
        // Store aliases in session storage
        const aliases = sessionStorage.getItem('practice_game_aliases');
        if (aliases) {
            // If they exist, remove them
            sessionStorage.removeItem('practice_game_aliases');
        }
        sessionStorage.setItem('practice_game_aliases', JSON.stringify(this.aliases));

        // Update the DOM with fetched data
        const infoMessage = document.getElementById('info-message');
        infoMessage.innerHTML = `
            <p id="practice-rule" class="cyberpunk scannedh">
                Welcome to Practice Mode, <span class="highlight">${this.aliases[0]}</span> and <span class="highlight">${this.aliases[1]}</span>! 
                Don't worry about your scores, this game is just for fun.
            </p>
            <div id="rules">
                <p id="practice-rule" class="cyberpunk inverse">
                    <span class="highlight">${this.aliases[0]}</span>, use the <span class="key">W</span> and <span class="key">S</span> keys to move your paddle up and down.
                </p>
                <p id="practice-rule" class="cyberpunk inverse">
                    <span class="highlight">${this.aliases[1]}</span>, use the <span class="key">↑</span> and <span class="key">↓</span> arrow keys to move your paddle up and down.
                </p>
            </div>
            <p id="rules-no-space" class="cyberpunk">
                First player to reach <span class="highlight">5 points</span> wins!
            </p>
        `;
        
    }

    async cleanup() {
        // console.log('Performing complete cleanup of LocalGameView');
        
        this.eventManager.removeAll(); // Remove all event listeners
        // 1. Remove buttons 
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
          startBtn.remove();
        }
        
        const openChatBtn = document.getElementById('open-chat-button');
        if (openChatBtn) {
          openChatBtn.remove();
        }
        
        // 2. Remove all game-related DOM elements
        const gameInfoContainer = document.getElementById('game-info-container');
        if (gameInfoContainer) {
          gameInfoContainer.remove();
        }
        
        const pongCanvas = document.getElementById('pong-canvas');
        if (pongCanvas) {
          pongCanvas.remove();
        }
        
        // 4. Clean up chat reference
        this.chat = null;
        
        // 5. Clean up any other properties
        this.aliases = null;
        
        // console.log('LocalGameView cleanup completed');
    }
}
