import { handleFetchErrors  } from "../utils/HandleFetchErrors.js";

export async function findGameInDB(gameId) { 
    try {
        const result = await handleFetchErrors(`/pong/game_session/${gameId}/`, 
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('access')}`
                },
            }
        )
        return result;
    }
    catch (error) {
        // console.log('Error fetching game from DB:', error);
    }
}