import { handleFetchErrors } from "../utils/HandleFetchErrors.js";

export async function createGameInstance(game_id, mode=null, players=null) {
    let access = sessionStorage.getItem('access');
    // if (!access)
    //     console.log('No access token found');
    // if (!mode)
    //     console.log('No mode found to create instance');
    try {
        if (players != null && players.length == 2) {
            // console.log(`Players: ${players}`);
            const player1_username = players[0];
            const player2_username = players[1];
            const result = await handleFetchErrors(`/pong/game_session/${game_id}/`, 
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${access}`
                    },
                    body: JSON.stringify({
                        game_id,
                        mode,
                        player1_username,
                        player2_username,
                    }),
                }
            )
        }
        else {
            // console.log(`Creating game instance without players`);
            const result = await handleFetchErrors(`/pong/game_session/${game_id}/`, 
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${access}`
                    },
                    body: JSON.stringify({
                        game_id,
                        mode,
                    }),
                }
            )
        }
    }
    catch (error) {
        // console.log(error);
        throw error;
    }
}