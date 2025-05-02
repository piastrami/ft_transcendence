import AbstractView from "./AbstractView.js";
import { MainChatWindow } from "../functions/chat/mainChatWindow.js";
import { getUsername } from "../functions/utils/getUsername.js";
import { navigateTo } from '../index.js';
import Dashboard from "../functions/dashboard/dashboard.js";
import MatchHistory from "../functions/dashboard/matchHistory.js";
import { getNavbar } from '../functions/navbar/Navbar.js';

export default class ProfileView extends AbstractView {
    constructor(params = {}) {

        super();

        this.dashboard = null;
        this.matchHistory = null;
        this.chat = null;
        this.user = null;

        if (params.username) {
            this.username = params.username;
            this.isOwnProfile = false;
        }
        else {
            this.username = null;
            this.isOwnProfile = true;
        }
        this.isFriend = false;

        // references to event listeners to be able to remove them in cleanup()
        this.boundOpenChat = null;
        this.boundPracticeNavigate = null;
        this.boundRemoteNavigate = null;
        this.boundTournamentNavigate = null;
        this.boundTestNavigate = null;
        this.boundTabClick = null;
        this.boundFriendsListeners = null;
        
        this.init();
    }

    async init() {

        // console.log('ProfileView.init()');
        try {
            this.user = await getUsername();
            
            // update navbar
            const navbar = getNavbar();
            if (navbar && navbar.ws && navbar.ws.getSocketStatus() === "%cNOTIF WEBSOCKET OPEN") {
                await navbar.update();
            }

            if (this.isOwnProfile) {
                this.username = await getUsername();
            } else {

            }
            
            await this.loadProfile();
            
            setTimeout(() => {
                this.setupTabs();
                this.loadDashBoard(this.username);
            }, 0);

        }
        catch (error) { throw error; }
    }

    async getHtml() {

        let html = `
            <section class="profile-view">
                <div class="account-container">
                    <div class="user-container">
                        <img class="account-img" id="profile-avatar" alt="Photo de profil">
                        <h2 class="account-username" id="username"></h2>`;
        
        // if (!this.isOwnProfile) {
        //     html += `
        //                 <button id="button-friend" class="cyberpunk purple">Add as friend</button>`;
        // }
        
        html += `</div></div>`;

        if (this.isOwnProfile) {

            html += `
                <div class="buttons-game-container">
                    <button id="practice-button" class="cyberpunk purple">Practice</button>
                    <button id="remote-button" class="cyberpunk purple">Play 1vs1</button>
                    <button id="tournament-button" class="cyberpunk purple">Tournament</button>
                </div>`;
        } else {

            html += `
                <div class="friends-container">
                    <h3 id="friends-title" class="cyberpunk">Friends</h3>
                    <div class="friends" id="friends"></div>
                </div>`;
        }

        html += `
                <div class="dashboard-container">
                    <div class="tabs-container">
                        <div class="tabs">
                            <button class="tab active" data-tab="dashboard">Dashboard</button>
                            <button class="tab" data-tab="history">Match History</button>
                        </div>
                    </div>
                    <div class="dashboard-content-container">
                        <div id="dashboard" class="tab-content active">
                            <div class="dashboard-grid">
                                <div class="card" id="total1vs1Games"></div>
                                <div class="card" id="totalGames"></div>
                                <div class="card" id="currentWinStreak"></div>
                                <div class="card" id="totalTournamentGames"></div>
                                <div class="card" id="wins"></div>
                                <div class="card" id="losses"></div>
                            </div>
                        </div>
                        <div id="history" class="tab-content">
                            <div id="match-history"></div>
                        </div>
                    </div>
                </div>
                
                <button id="open-chat-button" class="cyberpunk purple">LET'S CHAT</button>
            </section>
            
            `;
        return html;
    }

    async setupEventListeners() {

        // console.log("Setting up event listeners in ProfileView");
        
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
                // console.log('%cSetting up event listeners in ProfileView=> Chat button clicked',   'color: red');
                if (this.chat) {
                    this.chat.openChatPopover();
                } else {
                // console.log('Chat instance is null');
                }
            });
        }
            
        if (this.isOwnProfile) {
            /* Play Pong Section*/
            const practiceButton = document.getElementById('practice-button');
            if (practiceButton) {
                this.boundPracticeNavigate = () => {
                    navigateTo('/pong/practice');
                    const Navbar = getNavbar();
                    Navbar.update();
                };
                practiceButton.addEventListener('click', this.boundPracticeNavigate);
            }
            
            const remoteButton = document.getElementById('remote-button');
            if (remoteButton) {
                this.boundRemoteNavigate = () => {
                    // function that creates game between two devices
                    // console.log('remote button clicked');
                    navigateTo('/pong/create');
                    const Navbar = getNavbar();
                    Navbar.update();
                };
                remoteButton.addEventListener('click', this.boundRemoteNavigate);
            }
            
            const tournamentButton = document.getElementById('tournament-button');
            if (tournamentButton) {
                this.boundTournamentNavigate = async () => {
                    // console.log('tournament button clicked');
                    navigateTo('/tournament/create');
                    const Navbar = getNavbar();
                    Navbar.update();
                };
                tournamentButton.addEventListener('click', this.boundTournamentNavigate);
            }
        } 
        
    }
    
    setupTabs() {
        const activateTab = (tabName) => {
            // Retirer la classe 'active' de tous les onglets et contenus
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Ajouter la classe 'active' au bon onglet
            const activeTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }
            
            // Ajouter la classe 'active' au contenu correspondant
            const activeContent = document.getElementById(tabName);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        };

        // verifies which tab was active before refresh
        const savedTab = sessionStorage.getItem('activeTab') || 'dashboard';
        activateTab(savedTab);


        // memorize the active tab in case of refresh for better user experience
        this.boundTabClick = (event) => {
            const tabName = event.currentTarget.getAttribute('data-tab');
            sessionStorage.setItem('activeTab', tabName);
            activateTab(tabName);
        };

        // eventListener for dashboard / match history tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', this.boundTabClick);
        });
    }

    async loadDashBoard() {
        try {
            if (this.user)
            {
                this.dashboard = new Dashboard();
                this.matchHistory = new MatchHistory();
                await this.matchHistory.init(this.username);
                await this.dashboard.init(this.username);
            }
        } catch (error) {}
    }

    async loadProfile() {
        const response = await fetch(`/profiles/view/${this.username}/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('access')}`
          },
        });
        
        const data = await response.json();
        
        document.getElementById('profile-avatar').src = data.avatar;
        document.getElementById('username').textContent = data.user.username;
        
        if (!this.isOwnProfile) {
            await this.loadFriends(data);
        }
    }

    async loadFriends(data) {
        const friendsContainer = document.getElementById('friends');
        friendsContainer.innerHTML = '';
    
        // Créer une propriété pour stocker les écouteurs d'événements
        if (!this.boundFriendsListeners) {
            this.boundFriendsListeners = [];
        }
        
        // Vérifier si data.friends existe, est un tableau, et n'est pas vide
        if (data.friends && Array.isArray(data.friends) && data.friends.length > 0) {

            // sort friends by alphabetical order
            data.friends.sort((a, b) => {
                return a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' });
            });

            data.friends.forEach(friend => {
                // console.log('Données de l\'ami:', friend); // Déboguer les données de chaque ami
                const friendElement = document.createElement('div');
                friendElement.classList.add('friend');
                
                const friendImg = document.createElement('img');
                friendImg.src = friend.avatar;
                
                // Vérifier le nom d'utilisateur de la même manière
                const username = (friend.username) ? friend.username :
                    (friend.user && friend.user.username) ? friend.user.username : 'Utilisateur';
                
                // Fonction d'événement pour rediriger vers le profil
                const friendClickListener = () => {
                    // Utiliser la fonction navigateTo pour rediriger sans recharger la page
                    const Navbar = getNavbar();
                    if (friend.username === this.user) {
                        navigateTo('/profile');
                        Navbar.update();
                    }
                    else {
                        navigateTo(`/profile/${friend.username}`);
                        Navbar.update();
                    }
                };
    
                // Ajouter l'événement à l'élément
                friendElement.addEventListener('click', friendClickListener);
                
                // Ajouter l'événement au tableau pour pouvoir le supprimer plus tard si nécessaire
                this.boundFriendsListeners.push({ element: friendElement, listener: friendClickListener });
                
                // verify if the user is a friend (to modify the add as friend button)
                // if(username === this.user) {
                //     this.isFriend = true;
                //     const button = document.getElementById('button-friend');
                //     button.innerHTML = 'Challenge';
                //     // button.innerHTML = 'Remove friend';
                // }
                
                friendImg.classList.add('friend-avatar');
                friendImg.alt = username;
                
                // Créer un élément pour afficher le nom d'utilisateur
                const usernameElement = document.createElement('span');
                usernameElement.classList.add('friend-name');
                usernameElement.textContent = username;
                
                // Ajouter l'image et le nom à l'élément ami
                friendElement.appendChild(friendImg);
                friendElement.appendChild(usernameElement);
                friendsContainer.appendChild(friendElement);
            });
        } else {
            // console.log('Aucun ami trouvé ou tableau vide:', data.friends);
            // Afficher un message si aucun ami n'est trouvé ou si le tableau est vide
            friendsContainer.innerHTML = '<p id="no-friends-message">' + this.username + ' has no friends yet.</p>';
        }
    }
    
    cleanup() {
        
        this.user = null;
        
        if (this.isOwnProfile) {
            const practiceButton = document.getElementById('practice-button');
            if (practiceButton) {
                practiceButton.removeEventListener('click', this.boundPracticeNavigate);
            }
            
            const remoteButton = document.getElementById('remote-button');
            if (remoteButton) {
                remoteButton.removeEventListener('click', this.boundRemoteNavigate);
            }
            
            const tournamentButton = document.getElementById('tournament-button');
            if (tournamentButton) {
                tournamentButton.removeEventListener('click', this.boundTournamentNavigate);
            }
        } 
        
        // Nettoyage des écouteurs pour les onglets
        document.querySelectorAll('.tab').forEach(tab => {
            tab.removeEventListener('click', this.boundTabClick);
        });
        
        // Nettoyage des instances créées
        if (this.dashboard) {
            // Si Dashboard a une méthode cleanup, appelez-la
            if (typeof this.dashboard.cleanup === 'function') {
                this.dashboard.cleanup();
            }
            this.dashboard = null;
        }
        
        if (this.matchHistory) {
            // Si MatchHistory a une méthode cleanup, appelez-la
            if (typeof this.matchHistory.cleanup === 'function') {
                this.matchHistory.cleanup();
            }
            this.matchHistory = null;
        }
    }

}

