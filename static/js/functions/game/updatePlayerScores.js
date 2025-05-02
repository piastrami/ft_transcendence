import { handleFetchErrors } from "../utils/HandleFetchErrors.js";

export async function updateGameActivity(current_user, game_id,is_active, player1_score, player2_score) {
    try {
        const result = await handleFetchErrors(`/pong/game_session/update/${game_id}/`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game_id,
                    is_active,
                    player1_score,
                    player2_score,
                    current_user,
                }),
            })
        return result;
    }
    catch (error) {
        // console.log('Error:', error);
    }
}
