export class pongWsManager {
    
    constructor(url, accessToken, mode) {
        const tokenParam = `?token=${accessToken}`;
        const modeParam = `&mode=${mode}`;
        this.url = url + tokenParam + modeParam; 
        this.socket = null;
        this.accessToken = accessToken;
        //
        // this.url = 'ws://' + this.ip + ':8001/ws/pong/' + this.gameId + '/' + ?token=' + this.accessToken;
    }

    connect() {
        // console.log(`this.url in pongws manager: ${this.url}`);
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            if (this.onopen) {
                this.onopen();
            }
            // console.log('WebSocket connecté');
        };

        this.socket.onclose = () => {
            if (this.onclose) {
                this.onclose();
                // console.log('%cpong webSocket déconnecté', 'color: red; font-weight: bold;');
            }
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (this.onMessage) {
                this.onMessage(data); // callback défini dans pongGame.js
            }
        };
    }

    send(action, payload) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action, ...payload }));
            // console.log('Message envoyé:', { action, ...payload });
        }
    }
}

export default pongWsManager;