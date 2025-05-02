import { getUsername } from '../utils/getUsername.js';
import { loadNotifications } from './loadNotifications.js';
import notifWebSocket from '../notification/notifWebSocket.js';
import webSocketManager from '../chat/websocketManager.js';
import { navigateTo } from '../../index.js';
import { isAuthenticated } from '../authentication/isAuthenticated.js';

export class Navbar {

    constructor() {
        this.nav = null;
        this.user = null;
        this.ws = null;
    }
    
    async printNavbar() {
        //console.log('Navbar printNavbar() called');
        // check if a navbar already exists
        if (this.nav) {
            this.nav.remove();
        }
        // check if user is authenticated or not to display the right links and to init the websocket
        await this.is_user_authenticated();

        // navbar main element
        this.nav = document.createElement('nav');
        this.nav.className = 'navbar navbar-expand-lg';
        // div container
        const container = document.createElement('div');
        container.className = 'container-fluid';
        this.nav.appendChild(container);
        // brand
        const brand = document.createElement('a');
        brand.className = 'navbar-brand';
        brand.href = '/';
        brand.setAttribute('data-link', '');
        brand.textContent = 'SKYDJANGJAO';
        container.appendChild(brand);
        // put user's username in the navbar
        if (this.user) {
            const username = document.createElement('span');
            username.className = 'brand-username'; 
            username.textContent = ` | ${this.user}`;
            brand.appendChild(username);
        }
        // toggle button 
        const toggleButton = document.createElement('button');
        toggleButton.id = 'navbar-toggler';
        toggleButton.className = 'navbar-toggler';
        toggleButton.type = 'button';
        toggleButton.setAttribute('data-bs-toggle', 'collapse');
        toggleButton.setAttribute('data-bs-target', '#navbarTogglerDemo02');
        toggleButton.setAttribute('aria-controls', 'navbarTogglerDemo02');
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.setAttribute('aria-label', 'Toggle navigation');
        toggleButton.innerHTML = '<span class="navbar-toggler-icon"></span>';
        container.appendChild(toggleButton);
        // collapse element
        const collapse = document.createElement('div');
        collapse.className = 'collapse navbar-collapse';
        collapse.id = 'navbarTogglerDemo02';
        container.appendChild(collapse);
        // nav links
        const navList = document.createElement('ul');
        navList.className = 'navbar-nav ms-auto mb-2 mb-lg-0';
        collapse.appendChild(navList);
        // init nav links
        await this.init_navlinks(navList);
        // notifications
        if (this.user) {
            if (!this.ws)
                // console.log("%cconnected to notifWebSocket", "color: green");
                await notifWebSocket.connect();
            this.createNotificationDropdown(navList);
            loadNotifications();
        }
        
        return this.nav;
    }
    
    async is_user_authenticated() {

        await isAuthenticated();
        const token = sessionStorage.getItem('access');
            
        if (!token) {
            this.user = null;
            return;
        }
            
        this.user = await getUsername();
            
        if (!this.user) {
           // sessionStorage.removeItem('access');
            this.user = null;
            return;
        }
    }

    async init_navlinks(navList) {
        const currentPath = window.location.pathname;
    
        const links = [
            { href: '/signin', text: 'Sign in', show: !this.user },
            { href: '/signup', text: 'Sign up', show: !this.user },
            { href: '/profile', text: 'Profile', show: this.user && currentPath !== '/profile' },
            { href: '/settings', text: 'Settings', show: this.user && currentPath !== '/settings' },
            { href: '#', text: 'Log out', show: this.user, onclick: this.signout.bind(this) }, // Bind this to maintain context
        ];
        
        links.forEach(linkInfo => {
            if (linkInfo.show) {
                const listItem = document.createElement('li');
                listItem.className = 'nav-item';
                
                const link = document.createElement('a');
                link.className = 'nav-link';
                link.href = linkInfo.href;
                
                // Only add data-link for regular navigation, not for logout
                if (linkInfo.text !== 'Log out') {
                    link.setAttribute('data-link', '');
                }
                
                link.textContent = linkInfo.text;
                
                // Check if there's an onclick function and attach it
                if (linkInfo.onclick) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();  // Prevent default behavior for links
                        linkInfo.onclick();  // Call the signout function
                    });
                }

                listItem.appendChild(link);
                navList.appendChild(listItem);
            }
        });
    }

    createNotificationDropdown(navList) {
        const notificationItem = document.createElement('li');
        notificationItem.className = 'nav-item dropdown';
        
        // Icône de cloche pour les notifications
        const notificationLink = document.createElement('a');
        notificationLink.className = 'nav-link dropdown-toggle';
        notificationLink.href = '#';
        notificationLink.id = 'notificationDropdown';
        notificationLink.setAttribute('role', 'button');
        notificationLink.setAttribute('data-bs-toggle', 'dropdown');
        notificationLink.setAttribute('aria-expanded', 'false');
        notificationLink.innerHTML = `
            <i class="fas fa-bell" style="color: black; font-size: 1.1rem;"></i>
            <span id="notificationCount" class="badge bg-danger">0</span>
        `;
        
        // Menu déroulant pour les notifications
        const notificationMenu = document.createElement('ul');
        notificationMenu.className = 'dropdown-menu dropdown-menu-end';
        notificationMenu.setAttribute('aria-labelledby', 'notificationDropdown');
        notificationMenu.id = 'notificationList';
        
        notificationItem.appendChild(notificationLink);
        notificationItem.appendChild(notificationMenu);
        navList.appendChild(notificationItem);
    }
    
    async update() {

        //console.log('Navbar update() called');
        if (this.nav) {
            this.nav.remove();
        }
    
        this.nav = await this.printNavbar();
        if (!this.nav) {
            // console.log("Navbar not created!");
            return;
        }
    
        const app = document.getElementById('app');
        if (!app) {
            // console.log("App container not found!");
            return;
        }
    
        document.body.insertBefore(this.nav, app);
    }

    async signout() {
        // console.log('signout() called');
        
        try {
          // 1. Récupérer les tokens avant de les supprimer
          const accessToken = sessionStorage.getItem('access');
          const refreshToken = sessionStorage.getItem('refresh');
          
          // 2. Fermer les WebSockets
          if (webSocketManager) webSocketManager.closeSocket();
          if (notifWebSocket) notifWebSocket.closeSocket();
          
          // 3. Nettoyer sessionStorage
          sessionStorage.clear();
          
          // 4. Appeler l'API de déconnexion avec les tokens récupérés
          if (refreshToken) {
            try {
              await fetch('authentication/logout/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
              });
            } catch (error) {
            //   console.log('Server logout error:', error);
            }
          }
          
          // 5. Recharger la page complètement (solution fiable)
          window.location.href = '/?logout=' + Date.now();
          
        } catch (error) {
        //   console.log('Error during logout:', error);
          window.location.href = '/';
        }
      }
}

// Singleton for the navbar
let navbarInstance = null;

export const getNavbar = () => {
    if (!navbarInstance) {
        navbarInstance = new Navbar();
    }
    return navbarInstance;
};