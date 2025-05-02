
export default class MatchHistory {
    constructor() {
        this.container = document.getElementById("match-history");
        this.games = null;
    }

    async init(username) {
        try {

            this.games = await this.loadGames(username);
            // console.log('Données complètes reçues:', this.games);
            
            this.renderMatchHistory(this.games, username);
        } catch (error) {
            // console.log('Erreur détaillée:', error);
            throw error;
        }
    }

    async loadGames(username) {
        try {
            const response = await fetch(`/profiles/get-games/${username}/`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('access')}`
                },
            });

            // console.log(response);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur serveur');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    renderMatchHistory(games, username) {

        if (!Array.isArray(games)) {
            // console.log('Les données reçues ne sont pas un tableau:', games);
            return;
        }
        
        // match history table
        const table = document.createElement('table');
        table.className = 'historytable'; //class for CSS

        // table headline
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Mode</th> 
                <th>Result</th>
                <th>Opponent</th> 
                <th>Score</th> 
                <th>Date</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        // if no games yet
        if (games.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
              <td colspan="5" class="text-center">You have no games yet</td>
            `;
            const MatchHistorycontainer = document.getElementById("match-history");
            MatchHistorycontainer.style.overflowY = "hidden";
            tbody.appendChild(emptyRow);
          } else {
            games.forEach(game => {
              const row = document.createElement('tr');
              if (game.mode === 'Tournament')
                game.mode = 'Tourn.';
              
              // badge
              let resultBadgeClass;
              let resultText;
              if (game.winner.user.username === username) {
                resultBadgeClass = 'bg-success';
                resultText = 'Win';
              } else {
                resultBadgeClass = 'bg-danger';
                resultText = 'Loss';
              }
              
              // opponent 
              let opponent;
              if (game.player1.user.username === username)
                opponent = game.player2.user.username;
              else
                opponent = game.player1.user.username;
              
              // formate date
              const date = new Date(game.date);
              const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              
              // filling with data
              row.innerHTML = `
                <td>${game.mode}</td>
                <td><span class="history-badge ${resultBadgeClass}">${resultText}</span></td>
                <td>${opponent}</td>
                <td>${game.player1_score} - ${game.player2_score}</td>
                <td>${formattedDate}</td>
              `;
              tbody.appendChild(row);
            });
          }
          
        
        table.appendChild(tbody);
        this.container.appendChild(table);
        
        // ajout d'un div pour l'effet des lignes
        const scanEffect = document.createElement('scanEffect');
        scanEffect.className = 'scan-effect';
    }

}
