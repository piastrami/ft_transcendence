import { handleFetchErrors } from "../utils/HandleFetchErrors.js";

export default class TournamentPoller {
    constructor(tournamentID, onUpdate, pollingInterval = 2000) {
        this.tournamentID = tournamentID;
        this.onUpdate = onUpdate;
        this.pollingInterval = pollingInterval;
        this.intervalId = null;
        this.lastTournamentData = null;
        this.isPolling = false;
        this.access = sessionStorage.getItem('access');
    }
  
    start() {
        if (this.isPolling) return;
        // console.log('TournamentPoller started');
      
        this.isPolling = true;
        this.poll(); // Initial poll
        
        // Set up interval for subsequent polls
        this.intervalId = setInterval(() => this.poll(), this.pollingInterval);
    }
  
    async poll() {
        try {
        const tournamentData = await handleFetchErrors(`/pong/tournament/info/${this.tournamentID}/`, {
            method: 'GET',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.access}`
            }
        });
        
        // Check if data has changed significantly before triggering update
        if (this.hasSignificantChanges(tournamentData)) {
            this.lastTournamentData = tournamentData;
            this.onUpdate(tournamentData);
        }
        } catch (error) {
        // console.log('Error polling tournament data:', error);
        }
    }
  
    hasSignificantChanges(newData) {
        if (!this.lastTournamentData) return true;
        
        // Check for status change
        if (newData.status !== this.lastTournamentData.status) {
        // console.log('Status change detected:', newData.status, this.lastTournamentData.status);
            return true;
        }
        
        // Check for player count change
        if (newData.players.length !== this.lastTournamentData.players.length) {
            return true;
        }
        
        // Check for game changes
        if (this.hasGameChanges(newData.tournament_games, this.lastTournamentData.tournament_games)) {
            return true;
        }
        // Check for semifinal completion
        if (newData.status === 'semifinals') {
            const newSemifinals = newData.tournament_games.filter(game => game.round === 'semifinal');
            const oldSemifinals = this.lastTournamentData.tournament_games.filter(game => game.round === 'semifinal');
            
            const newAllCompleted = newSemifinals.length === 2 && 
            newSemifinals.every(game => game.game.is_active === false && game.game.winner !== null);
            
            const oldAllCompleted = oldSemifinals.length === 2 && 
            oldSemifinals.every(game => game.game.is_active === false && game.game.winner !== null);
            
            if (newAllCompleted && !oldAllCompleted) {
                return true;
            }

            // Check for final completion
            if (newData.status === 'finals') {
                const newFinal = newData.tournament_games.find(game => game.round === 'final');
                const oldFinal = this.lastTournamentData.tournament_games.find(game => game.round === 'final');
                
                if (newFinal && oldFinal) {
                    if (newFinal.game.is_active === false && newFinal.game.winner !== null &&
                        oldFinal.game.is_active === true) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
  
    hasGameChanges(newGames, oldGames) {
        if (!newGames || !oldGames) return true;
        if (newGames.length !== oldGames.length) return true;
        
        for (let i = 0; i < newGames.length; i++) {
        const newGame = newGames[i].game;
        const oldGame = oldGames[i].game;
        
        if (
            newGame.is_active !== oldGame.is_active ||
            newGame.player1_score !== oldGame.player1_score ||
            newGame.player2_score !== oldGame.player2_score ||
            (newGame.winner !== oldGame.winner)
        ) {
            // console.log('Game change detected in poller:', newGame, oldGame);
            return true;
        }
        }
      
        return false;
    }
  
    stop() {
        if (this.intervalId) {
            // console.log('TournamentPoller stopped');
            clearInterval(this.intervalId);
            this.intervalId = null;
            
            this.onUpdate = null;
        }
        this.isPolling = false;
        this.lastTournamentData = null;
    }
}
