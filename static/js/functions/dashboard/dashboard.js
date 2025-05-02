import { isAuthenticated } from '../authentication/isAuthenticated.js';

export default class GameDashboard {
    constructor() {
    }

    async init(username) {
        try {
            const dashboardData = await this.fetchDashboardData(username);            
            this.renderDashboard(dashboardData, username);
        } catch (error) {
            this.displayError(error.message);
        }
    }

    async fetchDashboardData(username) {
        try {
            const response = await fetch(`/profiles/get-games/${username}/`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('access')}`
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur serveur');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    renderDashboard(games, username) {

        if (!Array.isArray(games)) { return; }

        this.render1vs1Games(games);
        this.renderTotalGames(games);
        this.renderWinStreak(games, username);
        this.renderTournamentGames(games);
        this.renderWonGames(games, username);
        this.renderLostGames(games, username);
    }
    
    render1vs1Games(games){
        const Games1vs1Element = document.getElementById('total1vs1Games');
        
        const Games1vs1 = games.filter(game => game.mode === "1vs1").length;

        Games1vs1Element.innerHTML = `
            <h3>1vs1 Games played</h3>
            <p class="stat-number">${Games1vs1}</p>
        `;
    }

    renderTotalGames(games) {
        const totalGamesElement = document.getElementById('totalGames');
        const totalGames = games.length;
        
        totalGamesElement.innerHTML = `
            <h3>Total number of games played</h3>
            <p class="stat-number">${totalGames}</p>
        `;
    }

    renderWinStreak(games, username) {
        const winStreakElement = document.getElementById('currentWinStreak');
        
        let currentStreak = 0;
        let maxStreak = 0;
        
        const sortedGames = [...games].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        for (const game of sortedGames) {
            if (game.winner.user.username === username) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                break;
            }
        }

        winStreakElement.innerHTML = `
            <h3>Winning streak</h3>
            <p class="stat-number">${currentStreak}</p>
        `;
    }

    renderTournamentGames(games) {
        const tournamentGamesElement = document.getElementById('totalTournamentGames');
        
        const tournamentGames = games.filter(game => game.mode === 'Tournament').length;

        tournamentGamesElement.innerHTML = `
            <h3>Games played in tournaments</h3>
            <p class="stat-number">${tournamentGames}</p>
        `;
    }

    renderWonGames(games, username) {
        const wonGamesElement = document.getElementById('wins');
        
        const wonGames = games.filter(game => game.winner.user.username === username).length;

        wonGamesElement.innerHTML = `
            <h3>Victories</h3>
            <p class="stat-number">${wonGames}</p>
        `;
    }

    renderLostGames(games, username){
        const lostGamesElement = document.getElementById('losses');
        
        const lostGames = games.filter(game => game.winner.user.username != username).length;

        lostGamesElement.innerHTML = `
            <h3>Losses</h3>
            <p class="stat-number">${lostGames}</p>
        `;
    }

    displayError(message) {
        const elements = ['totalGames', 'wins', 'currentWinStreak'];
        elements.forEach(game_id => {
            const element = document.getElementById(game_id);
            if (element) {
                element.innerHTML = `
                    <div class="error-message">
                        <p>Erreur de chargement</p>
                        <small>${message}</small>
                    </div>
                `;
            }
        });
    }
}
