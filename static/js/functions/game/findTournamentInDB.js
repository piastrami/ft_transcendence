import { handleFetchErrors } from "../utils/HandleFetchErrors.js";

export async function findTournamentInDB(tournamentId) {
    const result = await handleFetchErrors(`/pong/tournament/info/${tournamentId}/`, {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('access')}`
        }
    });
    return result;
}