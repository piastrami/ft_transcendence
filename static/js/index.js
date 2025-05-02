// file that handles the front-end routing

import Homepage from "./views/HomepageView.js";
import Signin from "./views/SigninView.js";
import Signup from "./views/SignupView.js";
import Profile from "./views/ProfileView.js";
import { NotFoundView } from "./views/ErrorsView.js";
import { ServerErrorView } from "./views/ErrorsView.js";
import { ForbiddenView } from "./views/ErrorsView.js"; 
import OTPView from "./views/OTPView.js";
//Game views
import LocalGameView from "./views/game/LocalGameView.js";
import RemoteGameView from "./views/game/RemoteGameView.js";
import CompetitiveMatchView from "./views/game/CompetitiveMatchView.js";
import EachPracticeMatchView from "./views/game/EachPracticeMatchView.js";
import TournamentCreateView from "./views/game/tournament/CreateView.js";
import JoinTournamentView from "./views/game/tournament/JoinTournamentView.js";
////////////
import SettingsView from "./views/SettingsView.js";
import { checkIfUserExists } from "./functions/utils/checkIfUserExists.js";
import ResetPassword from "./views/ResetPassword.js";
import { showCustomConfirm } from "./functions/utils/customConfirm.js";
import { isOauth } from "./functions/authentication/isOauth.js";
import NotAuthenticatedView from "./views/NotAuthenticatedView.js";
import { isAuthenticated } from "./functions/authentication/isAuthenticated.js";
import { getNavbar } from "./functions/navbar/Navbar.js";
import { MainChatWindow } from "./functions/chat/mainChatWindow.js";
import { removeAlertsInCleanup } from "./functions/utils/removeAlertsInCleanup.js";
import { findGameInDB } from "./functions/game/findGameInDB.js";
import { findTournamentInDB } from "./functions/game/findTournamentInDB.js";

// Routes d'authentification: si l'utilisateur est déjà authentifié, on le redirige vers /profile
const authRoutes = [
    "/",
    "/signin",
    "/signup",
    "/reset-password",
    "/otp"
];

// Routes publiques: accessibles même sans authentification
const publicRoutes = [
    "/", 
    "/signin", 
    "/signup",
    "/notauthenticated", 
    "/reset-password", 
    "/otp", 
    "/403", 
    "/404", 
    "/500"
];

// where we want to have the chat
const chatRoutes = [
    "/profile",
    "/pong/practice",
    "/pong",
    "/pong/create",
    "/tournament/create",
    "/tournament"
];

let currentView = null;
let navbar = null;

export const navigateTo = async (url) => {
    //console.log("Navigating to:", url);
    
    // Vérifie si la vue actuelle a des changements non sauvegardés
    if (currentView && typeof currentView.hasUnsavedChanges === "function") {
        const hasChanges = currentView.hasUnsavedChanges();
        if (hasChanges) {
            const confirmNavigation = await showCustomConfirm("You have unsaved changes that will be lost!", "Go back", "Continue", false); 
            
            if (!confirmNavigation) {
                // console.log("Navigation cancelled due to unsaved changes");
                return; // Arrête la navigation si l'utilisateur annule
            }
        }
    }
    if (currentView && typeof currentView.showForfeitWarning === "function" && location.pathname !== url) {
        const leaveGame = await currentView.showForfeitWarning();
        if (leaveGame === false) {
            return ;
        }
    }
    if (currentView && typeof currentView.checkInterruption === "function" && location.pathname !== url) {
        // console.log("url is: ", url);
        // console.log("location.pathname is : ", location.pathname);
        await currentView.checkInterruption();
    }

    history.pushState({ path: url }, "", url);
    router();
};

export const router = async () => {
    //console.log("Router called");

    // Cas spécial pour OTP: vérifie immédiatement si l'utilisateur est authentifié
    if (location.pathname === "/otp") {
        const isAuthenticated_ = await isAuthenticated();
        if (isAuthenticated_) {
            // console.log("OTP route accessed while authenticated - using hard redirect");
            window.location.replace("/profile");
            return; // Arrête l'exécution du router ici
        }
    }

    const routes = [
        { path: "/", view: Homepage },
        { path: "/signin", view: Signin },
        { path: "/signup", view: Signup },
        { path: "/profile", view: Profile },
        { path: "/otp", view: OTPView },
        { path: "/404", view: NotFoundView },
        { path: "/500", view: ServerErrorView },
        { path: "/403", view: ForbiddenView },
        { path: "/pong/practice", view: LocalGameView },
        { path: /^\/pong\/practice\/[a-zA-Z0-9]{8}$/, view: EachPracticeMatchView, isRegex: true },
        { path: "/pong/create", view: RemoteGameView },
        { path: /^\/pong\/[a-zA-Z0-9]{8}$/, view: CompetitiveMatchView, isRegex: true },
        { path: "/tournament/create", view: TournamentCreateView },
        { path: /^\/tournament\/[a-zA-Z0-9]{8}$/, view: JoinTournamentView, isRegex: true },
        
        { path: /^\/profile\/(.+)$/, view: Profile, isRegex: true },
        { path: "/settings", view: SettingsView },
        { path: /^\/reset-password\/[a-zA-Z0-9]{30}$/, view: ResetPassword, isRegex: true },
        { path: "/notauthenticated", view: NotAuthenticatedView }
    ];
    
    const currentPath = location.pathname;
    const isAuthenticated_ = await isAuthenticated();
    
    // Close chat windows when navigating away from /profile
    const isChatRoute = chatRoutes.some(route => currentPath === route) || 
                    /^\/pong\/[a-zA-Z0-9]{8}$/.test(currentPath) ||
                    /^\/tournament\/[a-zA-Z0-9]{8}$/.test(currentPath) ||
                    /^\/profile\/(.+)$/.test(currentPath);
    if (!isChatRoute) {
        const chatWindow = MainChatWindow.instance;
        if (chatWindow) {
            const temp_state = sessionStorage.getItem('chatOpen');
            chatWindow.closeMainChatWindow();
            sessionStorage.setItem('chatOpen', temp_state);
        }
    }

    // Trouver la route correspondante
    const potentialMatches = routes.map(route => ({
        route,
        isMatch: route.isRegex 
            ? route.path.test(location.pathname)
            : location.pathname === route.path
    }));
    
    
    let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);
    
    // Pour les URLs dynamiques (comme les profils utilisateurs)
    let params = {};
    if (match && match.route.isRegex) {
        const matches = location.pathname.match(match.route.path);
        if (matches && matches.length > 1) {
            params.username = matches[1]; 
            
            // Vérifie si cet utilisateur a un profil
            try {
                const userExists = await checkIfUserExists(params.username);
                if (!userExists) {
                    // console.log("User does not exist, redirecting to 404");
                    match = { route: { path: "/404", view: NotFoundView }, isMatch: true };
                }
            } catch (error) {
                // console.log("Error checking if user exists:", error);
            }
        }
    }

    if (!match) {
        match = { route: { path: "/404", view: NotFoundView }, isMatch: true };
    }
    
    // Vérifier si la route actuelle est une route avec token de réinitialisation de mot de passe
    const isResetPasswordRoute = /^\/reset-password\/[a-zA-Z0-9]{30}$/.test(currentPath);
    
    // Check for recent logout flag to prevent redirect loop
    const justLoggedOut = sessionStorage.getItem('justLoggedOut') === 'true';
    
    // 1. Si l'utilisateur est sur une route d'authentification et qu'il est déjà authentifié
    // => rediriger vers /profile, SAUF si on vient juste de se déconnecter
    const isAuthRoute = authRoutes.some(route => currentPath === route);
    
    if (isAuthRoute && isAuthenticated_ && !justLoggedOut) {
        // console.log("User already authenticated, redirecting to profile");
        if (currentPath !== "/profile") {
            // Utiliser une redirection directe pour certains cas spécifiques
            if (currentPath === "/otp") {
                // console.log("OTP special case - using hard redirect");
                window.location.replace("/profile");
                return; // Arrête l'exécution ici
            } else {
                // Pour les autres routes, utiliser la navigation SPA normale
                await navigateTo("/profile");
                return; // On arrête l'exécution car navigateTo va rappeler router()
            }
        }
    }
    
    // 2. Si l'utilisateur est sur une route qui n'est pas publique et qu'il n'est pas authentifié
    // => rediriger vers /notauthenticated
    const isPublicRoute = publicRoutes.some(route => currentPath === route) || isResetPasswordRoute;
    
    if (!isPublicRoute && !isAuthenticated_) {
        // console.log("User not authenticated, redirecting to notauthenticated");
        if (currentPath !== "/notauthenticated") {
            await navigateTo("/notauthenticated");
            return; // On arrête l'exécution car navigateTo va rappeler router()
        }
    }

    // Nettoyer la vue actuelle si nécessaire
    if (currentView && typeof currentView.cleanup === "function") {
        // console.log(`Cleaning up ${currentView.constructor.name}`);
        await currentView.cleanup();
        removeAlertsInCleanup(); // function that removes any pending alerts from the previous view
    }

    let view;

    try {
        // Création des vues spéciales qui nécessitent des paramètres
        if (match.route.view === CompetitiveMatchView || match.route.view === EachPracticeMatchView || match.route.view === JoinTournamentView) {
            // Extraire le gameID de l'URL
            const gameID = location.pathname.slice(-8);
            
            if (match.route.view === EachPracticeMatchView) {
                view = new EachPracticeMatchView(gameID);
            } else if (match.route.view === JoinTournamentView) {
                const tournament = await findTournamentInDB(gameID);
                if (tournament && tournament.status === 'error') {
                    // console.log("Tournament not found in DB");
                    view = new NotFoundView();
                }
                else {
                    view = new JoinTournamentView(gameID);
                }

            }
            else {
                const game = await findGameInDB(gameID);
                if (game && game.status === 'error') {
                    // console.log("Game not found in DB");
                    view = new NotFoundView();
                }
                else {
                    view = new CompetitiveMatchView(gameID);
                }
            }
        } else if (match.route.view === ResetPassword) {
            // Extraire le token de l'URL pour la réinitialisation du mot de passe
            const token = location.pathname.slice(-30);
            // console.log("Token reset password:", token);
            view = new ResetPassword(token);
        } else if (match.route.view === SettingsView) {
            // Récupérer le statut OAuth avant de créer la vue
            const isOauthUser = await isOauth();
            view = new SettingsView({ isOauthUser });
        } else {
            // Cas par défaut: instancier la vue avec des params (si disponibles)
            view = new match.route.view(params || {});
        }

        if (!view) {
            throw new Error("View creation failed - view is null");
        }
        
        // Afficher la vue et configurer ses écouteurs d'événements
        document.querySelector("#app").innerHTML = await view.getHtml();
        await view.setupEventListeners();

        currentView = view;
    } catch (error) {
       
        try {
            view = new ServerErrorView();
            document.querySelector("#app").innerHTML = await view.getHtml();
            await view.setupEventListeners();
            currentView = view;
        } catch (fallbackError) {
            // console.error("Even the fallback error view failed:", fallbackError);
            document.querySelector("#app").innerHTML = "<div class='error'>Application error. Please refresh the page.</div>";
        }
    }
};

// Gestion du bouton retour du navigateur
window.addEventListener("popstate", async (e) => {
    // Vérifie s'il y a des changements non sauvegardés avant de revenir en arrière
    if (currentView && typeof currentView.hasUnsavedChanges === "function") {
        const hasChanges = currentView.hasUnsavedChanges();
        if (hasChanges) {
            e.preventDefault(); // N'a pas d'effet réel sur popstate
            
            // Utilisation d'une confirmation pour bloquer la navigation
            const confirmNavigation = await showNavigationAlert();
            if (!confirmNavigation) {
                // Si l'utilisateur annule, on restaure l'URL actuelle sans redéclencher popstate
                history.pushState(null, '', location.href);
                return; // Arrête la navigation si l'utilisateur annule
            }
        }
    }

    // Call cleanup on the current view before navigation
    if (currentView && typeof currentView.cleanup === "function") {
        // console.log(`Cleaning up ${currentView.constructor.name} due to popstate event`);
        await currentView.cleanup();
        removeAlertsInCleanup(); // function that removes any pending alerts from the previous view
    }

    if (navbar) {
        await navbar.update();
    }
    router();
});

document.addEventListener("DOMContentLoaded", async () => {
    
    const app = document.getElementById('app');
    navbar = getNavbar();
    const navbarElement = await navbar.printNavbar();
    document.body.insertBefore(navbarElement, app);
    
    document.body.addEventListener("click", async (e) => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            await navigateTo(e.target.href);
            await navbar.update();
        }
    });
    router();
});