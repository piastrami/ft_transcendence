import { pongWsManager } from './pongWsManager.js'; 
import { getIp } from './getIp.js';
import { showCustomAlert } from '../utils/customAlert.js';
import { showCustomConfirm } from '../utils/customConfirm.js';
import { navigateTo } from '../../index.js';
import { handleFetchErrors } from '../utils/HandleFetchErrors.js';
import { deletegamenotif } from '../notification/utils/utils.js';
import { getUsername } from '../utils/getUsername.js';
import { updateGameActivity } from './updatePlayerScores.js';
import { getGameId } from "../game/getGameId.js";
import { gameNotif } from "../notification/game/gameInvitation.js";
import { findGameInDB } from './findGameInDB.js';

class PongGame {
    
    constructor(canvasId, game_type, game_id, aliases = null, side = null, tournamentData = null) {
        // Canvas du html
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d');

        // Canvas interne pour dessiner le jeu
        this.drawingCanvas = document.createElement('canvas');
        this.drawingCanvas.width = 800; // Dimensions fixes
        this.drawingCanvas.height = 600;
        this.drawingContext = this.drawingCanvas.getContext('2d');

        // Initialisation
        this.keys = {}; // Stocker les touches appuyées
        // etat du jeu 
        this.state = {
            ball: { x: 400, y: 300, radius: 10 },
            left_paddle: { x: 20, y: 250, width: 10, height: 100 },
            right_paddle: { x: 770, y: 250, width: 10, height: 100 },
            score: { left: 0, right: 0 },
            is_running: false,
            game_over: false,
            player1_alias: null,
            player2_alias: null,
        }

        // ajout d'un intervalle pour limiter le nombre de messages envoyés au server pour éviter de surcharger le serveur et optimiser la fluidité du jeu
        this.lastSentUpdate = 0;
        this.UPDATE_INTERVAL = 50; // 50ms entre chaque envoi WebSocket
        this.init();
        this.game_type = game_type;
        this.gameId = game_id;
        this.notifID = this.gameId;
        this.wssIsDisconnected = false;
        this.isConnectionEstablished = false;
        this.interrupted = false;
        this.username = null;
        this.restart = false;
        this.reconnection = false;
        this.aliases = aliases;
        this.isTournamentGame = false;
        this.tournamentId = null;
        this.tournament = null;
        this.tournamentGame = null;
        if (tournamentData) {
            this.tournamentId = tournamentData.tournament.tournament_id;
            this.notifID = this.tournamentId;
            this.isTournamentGame = true;
            this.tournament = tournamentData.tournament;
            this.tournamentGame = tournamentData.tournament_game;
        }
        this.interrupted_by_alias = null;
        this.interrupted_by_username = null;
        this.side = side;
        this.otherPlayerJoined = false;
        // Écouteurs d'événements pour les touches
        window.addEventListener('keydown', (e) => this.handleKeyPressed(e));
        window.addEventListener('keyup', (e) => this.handleKeyReleased(e));
        
        // Écouteur d'événement pour etre responsive
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    async init() {
        
        // websocket initialization with host machine ip and gameId
        this.ip = await getIp();
        
        this.url = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
           this.ip + ':8001/ws/pong/' + this.gameId + '/';
        this.access = sessionStorage.getItem('access');
        this.username = await getUsername();
        
        try {
            await this.handle_connection_promise();
            if (this.interrupted === true) {
                return ;
            }
            if (this.aliases !== null && this.game_type === 'practice') {
                this.wss.send('set_alias', {
                    side: 'left',
                    alias: this.aliases[0],
                });
                this.wss.send('set_alias', {
                    side: 'right',
                    alias: this.aliases[1],
                });
                
            }
            this.resizeCanvas();
            let isReady = null;
            if (this.game_type === 'practice') {
                isReady = await this.practice_game_setup();
                if (!isReady) {
                    if (this.wss && this.wss.socket && this.wss.socket.readyState === WebSocket.OPEN) {
                        this.wss.socket.close();
                    }
                    navigateTo('/profile');
                    return ;
                    // throw new Error('Game cancelled');
                }
            }
            if (this.reconnection === false) {
                if (this.game_type === 'remote' && this.reconnection === false) {
                    await this.remote_game_setup();
                }
                if (this.interrupted === false) {
                    await this.ready_to_launch_game(isReady);
                }
            }
            if (sessionStorage.getItem('pongPlayerSide')) {
                this.side = sessionStorage.getItem('pongPlayerSide');
            }
        }
        catch (error) {
            // console.log('deleting notif with id :', this.notifID);
            await deletegamenotif(this.notifID);
            let navUrl = ``;
            if (this.isTournamentGame && this.tournamentId) {
                navUrl = `/tournament/${this.tournamentId}`;
            }
            else {
                navUrl = `/profile`;
            }
            if (error.message === 'Timeout') {
                if (this.side === 'left') {
                    let player1_timeout_score = 4;
                    if (this.isTournamentGame) {
                        player1_timeout_score = 5;
                    }
                    await updateGameActivity(this.username, this.gameId, false, player1_timeout_score, 0);
                }
                else if (this.side === 'right') {
                    let player2_timeout_score = 4;
                    if (this.isTournamentGame) {
                        player2_timeout_score = 5;
                    }
                    await updateGameActivity(this.username, this.gameId, false, 0, player2_timeout_score);
                }
                await showCustomAlert("Oops, the other player didn't join");
            }
            if (error.message === 'Game already over') {
                await showCustomAlert("Oops, you joined too late!");
            }
            navigateTo(navUrl);
        }
    }
    
    async handle_connection_promise() {
        const connectionPromise = new Promise((resolve, reject) => {
            this.wss = new pongWsManager(this.url, this.access, this.game_type);
            this.wss.onclose = async () => {
                this.wssIsDisconnected = true;
                if (this.restart == false && this.interrupted == false) {
                    reject(new Error('Connection closed by consumer'));
                }
            };
            // Configurer le callback pour recevoir les messages WebSocket
            this.wss.onMessage = async (data) => {
                if (data.type === 'connected') {
                    this.isConnectionEstablished = true;
                    
                    if (data.message) {
                        if (data.message == 'restart') {
                            this.update();
                            this.restart = true;
                        }
                        else if (data.message == 'player1') {
                            this.alias_placeholder = 'Player 1';
                            //// added by BUSE
                            sessionStorage.setItem('pongPlayerSide', 'left');
                            this.side = 'left';
                        }
                        else if (data.message == 'player2') {
                            this.alias_placeholder = 'Player 2';
                            //// added by BUSE
                            sessionStorage.setItem('pongPlayerSide', 'right');
                            this.side = 'right';
                        }
                        else if (data.message === 'reconnection') {
                            this.reconnection = true;
                            this.state.is_running = true;
                            const pongCanvas = document.getElementById('pong-canvas');
                            if (pongCanvas) {   
                                pongCanvas.style.visibility = 'visible';
                            }
                            await this.showWaitingScreen(false);
                            this.gameLoop();
                        }
                    }
                    resolve();
                }
                if (data.type === 'game_update') {
                    this.state = data.message; // Mettre à jour l'état local avec les données serveur
                    if (this.state.game_over) {
                        await this.game_over_alert();
                        if (this.wss && this.wss.socket && this.wss.socket.readyState === WebSocket.OPEN) {
                            this.wss.socket.close();
                        }
                    }
                }
                if (data.type == 'aliases_set') {
                    // console.log('%cAliases set in pongGame', 'color: green');
                    const { player1_alias, player2_alias } = data.message;
                    this.player1_alias = player1_alias;
                    this.player2_alias = player2_alias;
                }
                if (data.type === 'interrupted') {
                    if (data.message) {
                        this.state.is_running = false;
                        this.interrupted = true;
                        this.interrupted_by_alias = data.message['interrupted_by_alias'];
                        this.interrupted_by_username = data.message['interrupted_by_username'];

                        if (this.interrupted_by_username !== this.username) {
                            const pongCanvas = document.getElementById('pong-canvas');
                            if (pongCanvas && pongCanvas.style.visibility !== 'hidden') {
                                // console.log('pongCanvas is being hidden');
                                pongCanvas.style.visibility = 'hidden';
                            }
                            await showCustomAlert(`Oops! Game interrupted by ${this.interrupted_by_alias} :(`, 'OK');
                            let navUrl = ``;
                            if (this.isTournamentGame && this.tournamentId) {
                                navUrl = `/tournament/${this.tournamentId}`;
                            }
                            else {
                                navUrl = `/profile`;
                            }
                            navigateTo(navUrl);
                            if (this.wss && this.wss.socket && this.wss.socket.readyState === WebSocket.OPEN) {
                                this.wss.socket.close();
                            }
                            return;
                        }
                    }   

                }

                if (data.type === 'other_player_connected') { //connected but not necessarily ready
                    this.otherPlayerJoined = true;
                }
            };
            
            this.wss.connect();
        });
        return connectionPromise;
    }

    async practice_game_setup() {
        if (this.restart === true) {
            return true;
        }
        if (this.aliases) {
            this.player1_alias = this.aliases[0];
            this.player2_alias = this.aliases[1];
        }
        const isReady = await showCustomConfirm("Are you ready to start the game?");
        const pongCanvas = document.getElementById('pong-canvas');
        if (pongCanvas && isReady) {
            pongCanvas.style.visibility = 'visible';
        }
        return isReady;
    }
    
    async remote_game_setup() {
        const isReady = await showCustomConfirm("Are you ready to start the game?");
        if (this.otherPlayerJoined) {
            // console.log('%cother player connected', 'color: green'); 
        }
        if (!isReady) {
            this.interrupted = true;
            throw new Error('player changed their mind');
        }
        this.gameInDB = await findGameInDB(this.gameId);
        if (this.gameInDB.status === 'error' || (this.gameInDB.is_active === false && this.gameInDB.winner !== null)) {
            throw new Error('Game already over');
        }
        if (isReady) {
            await this.showWaitingScreen(true);
            let alias1 = this.username;
            let alias2 = this.username;
    
            if (this.isTournamentGame) {
                // console.log(`this.isTournamentGame is: ${this.isTournamentGame} and aliases are ${this.tournamentGame.alias1} and ${this.tournamentGame.alias2}`);
                alias1 = this.tournamentGame.alias1 || this.username;
                alias2 = this.tournamentGame.alias2 || this.username;
            }
    
            this.wss.send('set_alias', {
                side: this.side,
                alias: this.side === 'left' ? alias1 : alias2 
            });
            this.wss.send('ready');
        } 
    
        const originalOnMessage = this.wss.onMessage;
        this.wss.onMessage = async (data) => {
            if (data.type == 'aliases_set') {
                // console.log('%cAliases set in pongGame', 'color: green');
                const { player1_alias, player2_alias } = data.message;
                this.player1_alias = player1_alias;
                this.player2_alias = player2_alias;
            }
            else {
                await originalOnMessage(data);
            }
        };
    }

    async ready_to_launch_game(isReady) {

        if (isReady && this.game_type === 'practice') { 
            this.wss.send('ready', {});
            this.state.is_running = true;
            const pongCanvas = document.getElementById('pong-canvas');
            if (pongCanvas) {   
                pongCanvas.style.visibility = 'visible';
            }
            await this.showWaitingScreen(false);
            if (this.state.player1_alias && this.state.player2_alias) {
                if (!this.player1_alias || !this.player2_alias) {
                    this.player1_alias = this.state.player1_alias;
                    this.player2_alias = this.state.player2_alias;
                }
            }
            await this.gameLoop();
        }
        
        else if (this.game_type === 'remote') { 
            const bothPlayersReadyPromise = new Promise((resolve, reject) => {
                (async () => {
                    const timeout = setTimeout(async() => {
                        reject(new Error('Timeout'));
                    }, 180000); // 180 000 3 min timeout
                    
                    const originalOnMessage = this.wss.onMessage;
                    this.wss.onMessage = async (data) => {
                        if (data.message == 'Both players ready') {
                            clearTimeout(timeout);
                            // this.showWaitingScreen(false);
                            resolve();
                        }
                        else {
                            await originalOnMessage(data);
                        }
                    };
                })()
            });
            try {
                await bothPlayersReadyPromise;
                this.state.is_running = true;
                if (this.side == 'left') {
                    await deletegamenotif(this.notifID) // when the game finished i delete from notif db
                }
                const pongCanvas = document.getElementById('pong-canvas');
                if (pongCanvas) {   
                    pongCanvas.style.visibility = 'visible';
                }
                await this.showWaitingScreen(false);
                if (this.state.player1_alias && this.state.player2_alias) {
                    if (!this.player1_alias || !this.player2_alias) {
                        this.player1_alias = this.state.player1_alias;
                        this.player2_alias = this.state.player2_alias;
                    }
                }
                await this.gameLoop();
            }
            catch (error) {
                if (this.interrupted === false) {
                    await updateGameActivity(this.username, this.gameId, false, 0, 0); // because it is not active
                }
                // await deletegamenotif(this.notifID); // when it is autorejected i delete from notif db
                if (this.wss && this.wss.socket && this.wss.socket.readyState === WebSocket.OPEN) {
                    this.wss.socket.close();
                }
                throw error;
            }
        }
    }

    // function that resize the game according to the window : responsivness
    resizeCanvas() {
        const aspectRatio = 4 / 3;
        
        const container = this.canvas;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        // Ajuster la taille du canvas principal proportionnellement à la fenêtre
        // const width = window.innerWidth * 0.8; // 80% de la largeur de la fenêtre
        let width = containerWidth;
        let height = width / aspectRatio;
        
        if (height > containerHeight) {
            height = containerHeight;
            width = height * aspectRatio;
        }
        // Limiter la taille maximale
        this.canvas.width = Math.min(width, 800);
        this.canvas.height = Math.min(height, 600);
    }
    
    handleKeyPressed(e) {
        this.keys[e.key] = true;
    }
    
    handleKeyReleased(e) {
        this.keys[e.key] = false;
    }

    async gameLoop() {
        if (!this.state.is_running) 
            return;
        this.update();
        this.draw();
        await new Promise(resolve => requestAnimationFrame(resolve));
        await this.gameLoop();
    }
     
    update() {
        if (this.state) {
            const now = Date.now();
            if (now - this.lastSentUpdate >= this.UPDATE_INTERVAL) {
                let keyPressed = false;
    
                if (this.game_type === 'practice') {
                    if (this.keys['w'] || this.keys['s']) {
                        const up = this.keys['w'];
                        this.wss.send('move_paddle', { side: 'left', up });
                        keyPressed = true;
                    }
                    
                    if (this.keys['ArrowUp'] || this.keys['ArrowDown']) {
                        const up = this.keys['ArrowUp'];
                        this.wss.send('move_paddle', { side: 'right', up });
                        keyPressed = true;
                    }
                }
                else if (this.game_type === 'remote') {
                    if (this.keys['ArrowUp'] || this.keys['ArrowDown']) {
                        const up = this.keys['ArrowUp'];
                        if (this.side === 'left') {
                            this.wss.send('move_paddle', { side: 'left', up });
                        }
                        else if (this.side === 'right') { 
                            this.wss.send('move_paddle', { side: 'right', up });
                        }
                        keyPressed = true;
                    }
                }
                
                if (keyPressed) {
                    this.lastSentUpdate = now;
                }
            } 
        }
    }


    draw() {
        if (!this.state) return; 

        const ctx = this.drawingContext;

        // Effacer l'écran interne
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);

        // Dessiner les pointillés au milieu
        const canvasHeight = this.drawingCanvas.height;
        const canvasWidth = this.drawingCanvas.width;
        const lineWidth = 10; // Largeur des pointillés
        const lineHeight = 20; // Hauteur de chaque pointillé
        const gap = 10; // Espace entre les pointillés
        ctx.fillStyle = 'yellow';
        for (let y = -10; y < canvasHeight; y += lineHeight + gap) {
            ctx.fillRect((canvasWidth / 2) - (lineWidth / 2), y, lineWidth, lineHeight);
        }
       
        // Afficher les noms et le score 
        if (this.state.score) {
            ctx.font = '48px Arial'; // Changer de police
            ctx.fillStyle = 'yellow';
            const leftName = this.player1_alias + ': ' + this.state.score.left.toString();
            const rightName = this.player2_alias + ': ' + this.state.score.right.toString();
            const nameY = 50; // Y position for player names
            const leftNameWidth = ctx.measureText(leftName).width;
            const rightNameWidth = ctx.measureText(rightName).width;
            ctx.fillText(leftName, canvasWidth/4 - leftNameWidth/2, nameY);
            ctx.fillText(rightName, (canvasWidth * 3/4) - rightNameWidth/2, nameY);
        }

        // Dessiner la balle
        const ball = this.state.ball;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // Dessiner les paddles
        const leftPaddle = this.state.left_paddle;
        const rightPaddle = this.state.right_paddle;

        ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
        ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);


        // Dessiner le canvas interne dans le canvas principal, redimensionné
        this.context.drawImage(this.drawingCanvas, 0, 0, this.canvas.width, this.canvas.height);

    }

    async game_over_alert() {
        this.state.is_running = false;
        const pongCanvas = document.getElementById('pong-canvas');
        if (pongCanvas) {  
            pongCanvas.style.visibility = 'hidden';
        }
        const player1_score = this.state.score.left;
        const player2_score = this.state.score.right;
        if (this.game_type === 'remote' && this.interrupted === false) {
            await updateGameActivity(this.username, this.gameId, false, player1_score, player2_score);
        }
        this.draw();

        let winner = null;
        if (player2_score > player1_score) {
            winner = this.state.player2_alias;
        }
        else {
            winner = this.state.player1_alias;
        }

        const gameOverPanel = document.getElementById('game-over-panel');
        const winnerText = document.getElementById('winner-text');
        const finalScores = document.getElementById('final-scores');
        const playAgainBtn = document.getElementById('play-again-btn');
        const profileBtn = document.getElementById('profile-btn');

        if (winnerText && finalScores) {
            winnerText.textContent = `${winner} wins!`;
            finalScores.textContent = `Final scores: ${player1_score} - ${player2_score}`;
        }

        if (this.isTournamentGame && playAgainBtn) {
            playAgainBtn.textContent = "Return to tournament";
            playAgainBtn.onclick = () => {
                navigateTo(`/tournament/${this.tournamentId}`);
                if (gameOverPanel) {
                    gameOverPanel.style.display = 'none';
                }
                return;
            }
            profileBtn.style.display = 'none';
        }
        else if (playAgainBtn && this.game_type === 'remote') {
            playAgainBtn.textContent = "Play again";
            playAgainBtn.onclick = async () => {
                try {
                    const players = [this.player1_alias, this.player2_alias];
                    const new_gameID = await getGameId("1vs1", players);
                    // console.log(`this.username is : ${this.username} and this.player1_alias is : ${this.player1_alias} and this.player2_alias is : ${this.player2_alias}`);
                    if (this.username === this.player1_alias)
                        this.otherUser = this.player2_alias;
                    else
                        this.otherUser = this.player1_alias;
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
        if (gameOverPanel) {
            gameOverPanel.style.display = 'block';
        }

    }

    async handleWebSocketClosed() {
        if (this.game_type === 'remote' && this.interrupted === true && this.username !== this.interrupted_by) {   
            // await this.deleteGame();
            // deletegamenotif(this.notifID); // when the game is interrupted i delete from notif db
        }
    }

    async deleteGame() {
        try {
            const result = await handleFetchErrors(`/pong/game_session/${this.gameId}/`, 
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.access}`
                    },
                }
            )
        }
        catch (error) {
            throw error;
        }
    }

    async showWaitingScreen(show, gameId = null) {
        const waitingScreen = document.getElementById('waiting-screen');
        if (!waitingScreen) {
            return;
        } 
        if (show) {
            // console.log('Showing waiting screen');
            waitingScreen.style.display = 'flex';
        } else {
            waitingScreen.style.display = 'none';
        }
    }

    async cleanup() {
        if (this.state && this.state.is_running) {
            this.state.is_running = false;
        }
        if (this.wss && this.wss.socket && this.wss.socket.readyState === WebSocket.OPEN) {
            this.wss.socket.close();
        }
    }
}


export default PongGame;
