import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
    }    
        
    async getHtml() {
        return `
            <section class="home-page">
                <h1 class="cyberpunk" id="welcome-title"><p id="welcome-brand"> Welcome! How to play?</p></h1>
                <div class="welcome-container">
                    <div class="welcome-tabs-container">
                        <div class="welcome-tabs">
                            <button class="welcome-tab active" data-tab="practice" id="tab-practice">Practice</button>
                            <button class="welcome-tab" data-tab="1vs1" id="tab-1vs1">1vs1</button>
                            <button class="welcome-tab" data-tab="tournament" id="tab-tournament">Tournament</button>
                        </div>
                    </div>
                    <div class="welcome-content-container">
                        <div id="practice" class="welcome-tab-content active">
                            <div class="game-info-container">
                                <p class="cyberpunk" id="welcome-text">
                                    In Practice Mode, do not worry about your scores, this game is just for fun and does not count for your stats.
                                </p>
                                <div id="rules-welcome">
                                    <p class="cyberpunk inverse" id="welcome-text">
                                        <span class="highlight">Player 1</span> uses the <span class="key">W</span> and <span class="key">S</span> keys to move their paddle up and down.
                                    </p>
                                    <p class="cyberpunk inverse" id="welcome-text">
                                        <span class="highlight">Player 2</span> uses the <span class="key">↑</span> and <span class="key">↓</span> arrow keys to move their paddle up and down.
                                    </p>
                                </div>
                                <p class="cyberpunk" id="welcome-text">The first player to reach <span class="highlight">5 points</span> wins!</p>
                            </div>
                        </div>
                        <div id="1vs1" class="welcome-tab-content">
                            <div class="game-info-container">
                                <p class="cyberpunk" id="welcome-text">
                                    Choose from available online players and play a pong game to improve your stats!
                                </p>
                                <p class="cyberpunk inverse" id="welcome-text">
                                    Players use the <span class="key">↑</span> and <span class="key">↓</span> arrow keys to move their paddle up and down.
                                </p>
                                <p class="cyberpunk" id="welcome-text">The first player to reach <span class="highlight">5 points</span> wins!</p>
                            </div>
                        </div>
                        <div id="tournament" class="welcome-tab-content">
                            <div class="game-info-container">
                                <p class="cyberpunk" id="welcome-text">
                                    Tournaments are between 4 players. You can choose between available online players to start a  competition.
                                    Two pairs of players are matched randomly for <span class="highlight">semi-finals</span>. The winners play against each other in the <span class="highlight">finals</span>.
                                </p>
                                <p class="cyberpunk inverse" id="welcome-text">
                                    Players use the <span class="key">↑</span> and <span class="key">↓</span> arrow keys to move their paddle up and down.
                                </p>
                                <p class="cyberpunk" id="welcome-text">For each game : the first player to reach <span class="highlight">5 points</span> wins!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    async setupEventListeners() {
        // Sélectionne les onglets par ID au lieu de classe
        const tabPractice = document.getElementById('tab-practice');
        const tab1vs1 = document.getElementById('tab-1vs1'); 
        const tabTournament = document.getElementById('tab-tournament');
        
        // Sélectionne les contenus d'onglets
        const contentPractice = document.getElementById('practice');
        const content1vs1 = document.getElementById('1vs1');
        const contentTournament = document.getElementById('tournament');
        
        // Fonction pour activer un onglet et son contenu
        const activateTab = (activeTab, activeContent) => {
            // Désactive tous les onglets
            tabPractice.classList.remove('active');
            tab1vs1.classList.remove('active');
            tabTournament.classList.remove('active');
            
            // Désactive tous les contenus
            contentPractice.classList.remove('active');
            content1vs1.classList.remove('active');
            contentTournament.classList.remove('active');
            
            // Active l'onglet et le contenu sélectionnés
            activeTab.classList.add('active');
            activeContent.classList.add('active');
        };
        
        // Ajoute les gestionnaires d'événements
        if (tabPractice) {
            tabPractice.addEventListener('click', () => activateTab(tabPractice, contentPractice));
        }
        
        if (tab1vs1) {
            tab1vs1.addEventListener('click', () => activateTab(tab1vs1, content1vs1));
        }
        
        if (tabTournament) {
            tabTournament.addEventListener('click', () => activateTab(tabTournament, contentTournament));
        }
    }
}