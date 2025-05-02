import { friendRequest } from "../notification/friend/friendRequest.js";
import { loadFriends, fetchFriends } from "../notification/friend/friendList.js";
import { loadUsers } from "../utils/loadUsers.js";
import { fetchUsers } from "../utils/loadUsers.js";
import { IndividualChatWindow } from "./individualChatWindow.js"
import { getUsername } from "../utils/getUsername.js";
import { navigateTo } from "../../index.js";
import  webSocketManager  from './websocketManager.js'
import { getNavbar } from "../navbar/Navbar.js";

export class MainChatWindow {
    
    constructor() {
        if (MainChatWindow.instance) {
            // console.log('%cthere is MainChatWindow.instance', 'color: blue');
            return MainChatWindow.instance; // Empêche une nouvelle instance
        }
        
        MainChatWindow.instance = this;
        this.unread = {};
        this.user = null;
        this.unread_from = null;
        this.userList = null;
        this.friendList = null;
        this.individualChatWindow = null;
        this.lastChat = null;
        
        // Map pour stocker les références aux event listeners
        this.eventListeners = new Map();

        // Insert HTML first
        this.insertHTML();
    }

    /**
     * Méthode statique pour obtenir l'instance du chat
     * Crée une nouvelle instance si nécessaire ou actualise l'instance existante
     * @returns {Promise<MainChatWindow>} L'instance de MainChatWindow
     */
    static async getChat() {
        // console.log('%cMainChatWindow.getChat() called', 'color: blue');
        
        if (!MainChatWindow.instance) {
            // console.log("%cCréer une nouvelle instance et l'initialiser", 'color: blue')
            const chatInstance = new MainChatWindow();
            await chatInstance.init();
            return chatInstance;
        } else {
            // Utiliser l'instance existante et actualiser les références DOM
            // console.log('%cusing existing chat instance');
            // console.log('%cchat was opened : ', sessionStorage.getItem('chatOpen'), ' and indivChatOpen : ', sessionStorage.getItem('indivChatOpen'));
            await MainChatWindow.instance.cleanup(); // Nettoyer les listeners existants
            await MainChatWindow.instance.refreshDomReferences();
            await MainChatWindow.instance.restorePreviousState();
            return MainChatWindow.instance;
        }
    }

    async init() {
        // console.log('%cMainChatWindow.init() called =>', 'color: blue');
        
        // Get fresh DOM references
        await this.refreshDomReferences();
        
        // Get fresh user data
        this.user = await getUsername();
        this.userList = await fetchUsers();
        this.friendList = await fetchFriends();
        
        await this.restorePreviousState();
        
        return this; // Return this for chaining
    }

    async restorePreviousState() {

        // if the conv chat was closed
        if (sessionStorage.getItem('indivChatOpen') === 'false')
        {
            const individualChatsContainer = document.getElementById('individual-chats-container');
            if (individualChatsContainer) 
                individualChatsContainer.style.display = 'none';
        }

        // if main users window was open 
        if (sessionStorage.getItem('chatOpen') === 'true') {
            // console.log('%cMainChatWindow.restorePreviousState() called => chatOpen is true => opening chat popover',   'color: green');
            this.openChatPopover();
        } else {
            this.closeMainChatWindow();
        }

        // if indiv chat window was open
        if (sessionStorage.getItem('indivChatOpen') === 'true' && sessionStorage.getItem('lastChat')) {
            let response = await fetch(`/authentication/get-user/?id=${sessionStorage.getItem('lastChat')}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem(`access`)}`
                  },
            }); 
            if (response.ok) {
                response = await response.json();
            }

            this.lastChat = response.username;
            
            // console.log('Reopening chat with:', this.lastChat);
            this.individualChatWindow = new IndividualChatWindow(this.user, this.lastChat);
            await this.individualChatWindow.init();
        }

    }

    async refreshDomReferences() {
        // console.log('MainChatWindow.refreshDomReferences() called');

        // Nettoyer les listeners existants avant de réassigner les références
        this.cleanup();

        // Get essential chat container elements
        this.chatContainer = document.getElementById('chat-container');
        this.chatPopover = document.getElementById('main-chat-window');
        this.closeChatBtn = document.getElementById('close-chat-btn');
        this.userListContainer = document.getElementById('users-list');
        this.friendsListDiv = document.getElementById('friends-list');
        this.userListInfo = document.getElementById('users-list-info');

        await this.setupEventListeners();
        
        return this; // Return this for chaining
    }
    
    /**
     * Ajoute un event listener et le garde en mémoire pour pouvoir le supprimer plus tard
     * @param {HTMLElement} element - L'élément DOM auquel attacher l'event listener
     * @param {string} eventType - Le type d'événement (ex: 'click')
     * @param {Function} callback - La fonction à appeler lors de l'événement
     * @param {Object} options - Options supplémentaires pour addEventListener
     */
    addEventListenerWithTracking(element, eventType, callback, options = {}) {
        if (!element) return;
        
        // Lier la fonction au contexte actuel
        const boundCallback = callback.bind(this);
        
        // Stocker les informations sur l'event listener
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }
        
        this.eventListeners.get(element).push({
            eventType,
            callback: boundCallback,
            options
        });
        
        // Ajouter l'event listener
        element.addEventListener(eventType, boundCallback, options);
    }

    /**
     * Retire tous les event listeners associés à un élément
     * @param {HTMLElement} element - L'élément DOM dont les event listeners doivent être supprimés
     */
    removeAllEventListeners(element) {
        if (!element || !this.eventListeners.has(element)) return;
        
        const listeners = this.eventListeners.get(element);
        
        listeners.forEach(listener => {
            element.removeEventListener(
                listener.eventType,
                listener.callback,
                listener.options
            );
        });
        
        this.eventListeners.delete(element);
    }
    
    /**
     * Nettoie tous les event listeners enregistrés
     */
    cleanup() {
        // console.log('%cMainChatWindow.cleanup() called','color: blue');
        
        // Supprimer tous les event listeners enregistrés
        for (const [element, _] of this.eventListeners) {
            this.removeAllEventListeners(element);
        }
        
        // Vider la map
        this.eventListeners.clear();
        
        // Fermer les fenêtres de chat individuelles si nécessaire
        if (this.individualChatWindow) {
            if (typeof this.individualChatWindow.cleanup === "function") {
                this.individualChatWindow.style.display = 'none';
                // this.individualChatWindow.cleanup();
            }
            this.individualChatWindow = null;
        }
    }
    
    async setupEventListeners() {
        // Set up close button
        if (this.closeChatBtn) {
            this.addEventListenerWithTracking(this.closeChatBtn, 'click', this.closeMainChatWindow);
        }
        
        // Set up user list container
        if (this.userListContainer) {
            this.addEventListenerWithTracking(this.userListContainer, 'click', this.handleUserClick);
        }
        if (this.userListInfo) {
            this.addEventListenerWithTracking(this.userListInfo, 'click', async (event) => {
                // Only handle if not already handled by another listener
                if (!event.handledByUserList && event.target.closest('[data-username]')) {
                    event.handledByUserList = true;
                    await this.handleUserClick(event);
                }
            });
        }
    
        // Set up search functionality
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            this.addEventListenerWithTracking(searchInput, 'input', this.handleSearch);
        }
    }
    
    insertHTML() {
        // First check if the chat container already exists to avoid duplicates
        if (!document.getElementById('chat-container')) {
            const chatHTML = `
                <div id="chat-container" class="cyberpunk black">
                    <div id="main-chat-window" class="cyberpunk main-chat-window hidden">
                        <div class="popover-header">
                            <button id="close-chat-btn" class="cyberpunk red">x</button>
                        </div>
                        <div id="user-list-container">
                            <div class="search-container">
                                <input id="user-search" placeholder="🔍 Search user" />
                            </div>
                            <ul class="cyberpunk" id="users-list-info"></ul>
                            <h4 class="cyberpunk">Friends</h4>
                            <ul class="cyberpunk" id="friends-list"></ul>
                            <h4 class="cyberpunk">Users</h4>
                            <ul class="cyberpunk" id="users-list"></ul>
                        </div>
                    </div>
                    <div id="individual-chats-container" class="cyberpunk black"></div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', chatHTML);
        }
    }

    async updateFriendsAndUsers() {
        // console.log('%cupdateFriendsAndUsers() called', 'color: blue');
        if (this.userListContainer) this.userListContainer.innerHTML = '';
        if (this.friendsListDiv) this.friendsListDiv.innerHTML = '';
        if (this.userListInfo) this.userListInfo.innerHTML = '';
        
        this.user = await getUsername();
        this.userList = await fetchUsers();
        this.friendList = await fetchFriends();

        await loadFriends(this.friendList, this.unread, this.unread_from);
        await loadUsers(this.userList, this.unread, this.unread_from);
    }

    async openChatPopover() {
        // console.log("%copenChatPopover() called", 'color: blue');

        // IMPORTANT: We don't store a reference to openChatBtn as a property
        // Instead, get a fresh reference each time we need it
        const openChatBtn = document.getElementById('open-chat-button');
        
        if (this.chatContainer && this.chatContainer.style.display === 'none') {
            this.chatContainer.style.display = 'flex';
        }
        
        if (this.chatPopover && this.chatPopover.classList.contains('hidden')) {
            this.chatPopover.classList.remove('hidden');
            this.chatPopover.classList.add('visible');
        } else {
            // console.log('mainChatWindow Popover is null');
            // Try to re-initialize DOM references
            this.refreshDomReferences();
        }
        
        // Only hide the button if we could find it
        if (openChatBtn && openChatBtn.style.display !== 'none') {
            openChatBtn.style.display = 'none';
        } else {
            // This is expected in some cases, so we'll just log it
            // console.log('%copenChatBtn is null in openChatPopover (this is OK if button is managed externally)',    'color: blue');
        }
        
        // console.log('%cupdateFriendAndUsers() called from main chat:', 'color: blue');
        await this.updateFriendsAndUsers();
        sessionStorage.setItem('chatOpen', 'true');
    }

    closeMainChatWindow() {
        // console.log('closeMainChatWindow() called');
        sessionStorage.setItem('chatOpen', 'false');
        
        // Get a fresh reference to the open button
        const openChatBtn = document.getElementById('open-chat-button');

        const individualChatsContainer = document.getElementById('individual-chats-container');
        if (individualChatsContainer) {
            const existingChatWindows = individualChatsContainer.querySelectorAll('.chat-window');
            existingChatWindows.forEach(chatWindow => {
                // Close the WebSocket connection
                if (webSocketManager && typeof webSocketManager.closeSocket === 'function') {
                    webSocketManager.closeSocket();
                    // console.log('WebSocket connection closed for individual chat window');
                }
                // Remove the chat window from the DOM
                chatWindow.remove();
            });
            // Reset the individual chat window references
            this.individualChatWindow = null;
            sessionStorage.setItem('indivChatOpen', 'false');
        }
        
        if (this.chatPopover) {
            this.chatPopover.classList.remove('visible');
            this.chatPopover.classList.add('hidden');
        } else {
            // console.log('mainChatWindow Popover is null');
            // Try to re-initialize DOM references
            this.refreshDomReferences();
        }
        
        // Only show the button if we could find it
        if (openChatBtn) {
            openChatBtn.style.display = 'block';
        } else {
            // This is expected in some cases, so we'll just log it
            // console.log('openChatBtn is null in closeMainChatWindow (this is OK if button is managed externally)');
        }
        
        if (this.chatContainer) {
            this.chatContainer.style.display = 'none';
        }  
    }

    async handleUserClick(event) {
        // Stop if we're not clicking on a user item
        if (!event.target.closest('[data-username]')) return;
        
        // Récupérer les données utilisateur actuelles (éviter d'utiliser des données en cache)
        this.user = await getUsername();
        
        const target = event.target;
        const usernameElement = target.closest('[data-username]');
        const friendName = usernameElement?.dataset.username;
        // console.log(`%cusernameElement: ${usernameElement}`, 'color : red');
        // console.log('friendName in handleUserClick:', friendName);
        
        if (friendName) {
            if (target.classList.contains('user-name')) {
                // Check if a chat window already exists for this user before creating a new one
                const existingChatWindow = document.getElementById(`chat-window-${friendName}`);
                if (!existingChatWindow) {
                    this.individualChatWindow = new IndividualChatWindow(this.user, friendName);
                    await this.individualChatWindow.init();
                    // Remove mail icon when opening chat
                    if (friendName === 'info') {
                        this.removeInfoMailIcon(friendName);
                    } else {
                        this.removeMailIcon(friendName);
                    }
                } 
                // else {
                //     // console.log(`Chat window for ${friendName} already exists`);
                // }
            } else if (target.classList.contains('btn-add-friend')) {
                // Actualiser l'utilisateur avant d'envoyer la demande pour s'assurer 
                // qu'on utilise le bon contexte utilisateur
                await friendRequest(friendName);
            } else if (target.classList.contains('btn-view-profile')) {
                const navbar = getNavbar();
                await navbar.update();
                navigateTo(`/profile/${friendName}`);
            }
        }
    }

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        
        // Search in both users list and friends list simultaneously
        const allUserItems = document.querySelectorAll('#users-list .user-item, #friends-list .friend-user-item');
        
        allUserItems.forEach(item => {
            const usernameElement = item.querySelector('.user-name');
            if (usernameElement) {
                const username = usernameElement.textContent.toLowerCase();
                if (username.startsWith(searchTerm)) {
                    item.style.display = ''; // Show the item if it matches
                } else {
                    item.style.display = 'none'; // Hide the item if it doesn't match
                }
            }
        });
    }

    async removeMailIcon(username) {
        // console.log('removeMailIcon called for username:', username);
        const userElement = document.querySelector(`.user-name[data-username='${username}']`);
        if (userElement) {
            // console.log('userElement found in remiveIcon:', userElement);
            const mailIcon = userElement.querySelector(".mail-icon");
            if (mailIcon) {
                mailIcon.remove();
            }
            this.unread[username] = false;
        }
    }
    
    async removeInfoMailIcon(username) {
        // console.log('removeInfoMailIcon called for username:', username);
        const userElement = document.querySelector(`.user-name[data-username='${username}']`);
        if (userElement) {
            const parentItem = userElement.closest('li'); // find the parent <li>
            if (parentItem) {
                const mailIcon = parentItem.querySelector(".infomail-icon");
                if (mailIcon) {
                    // console.log("Removing infomail icon for:", username);
                    mailIcon.remove();
                }
            }
            this.unread[username] = false;
        }
    }
    
    // async sendFriendRequest(friendName) {
    //     await friendRequest(friendName);
    // }
}
