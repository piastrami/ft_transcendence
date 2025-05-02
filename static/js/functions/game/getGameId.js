import { handleFetchErrors } from "../utils/HandleFetchErrors.js";
import { createGameInstance } from "./createGameInstance.js";

export async function getGameId(mode = null, players = null) {
    try {
        if (!mode) {
            throw new Error("No mode found to create game instance");
        }
        const result = await handleFetchErrors('/pong/generate_id/',{
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // create game instance dans la DB avec result.game_id
        try {
            await createGameInstance(result.game_id, mode, players);
        }
        catch (error) {
            // console.log("Error creating game instance: ", error);
            throw error;
        }
        // console.log("result.game_id: ", result.game_id);

        return result.game_id;
    }
    catch (error) {
        // console.log("Error:", error);
        return (null)
    }
}
