import { showCustomPrompt } from "../utils/customPrompt.js";
import { showCustomAlert } from "../utils/customAlert.js";
import { handleFetchErrors } from "../utils/HandleFetchErrors.js";

export async function set_player_aliases() {
    
    let player1_alias = await showCustomPrompt("Player 1, what's your alias?", "Player 1");
    if (player1_alias === null) {
        return null;
    }
    while (player1_alias.trim() === "" || player1_alias.length > 15) {
        if (player1_alias.trim() === "") {
            await showCustomAlert("Player 1 alias must not be empty");
        }
        else if (player1_alias.length > 15) {
            await showCustomAlert("Player 1 alias must be less than 15 characters");
        }
        player1_alias = await showCustomPrompt("Player 1, what's your alias?", "Player 1");
    }
    
    let player2_alias = await showCustomPrompt("Player 2, what's your alias?", "Player 2");
    if (player2_alias === null) {
        return null;
    }
    while (player2_alias.trim() === "" || player2_alias.length > 15 || player2_alias.toLowerCase() === player1_alias.toLowerCase()) {
        if (player2_alias.trim() === "") {
            await showCustomAlert("Player 2 alias must not be empty");
        }
        else if (player2_alias.length > 15) {
            await showCustomAlert("Player 2 alias must be less than 15 characters");
        }
        if (player2_alias.toLowerCase() === player1_alias.toLowerCase()) {
            await showCustomAlert("Player 2 alias must be different from Player 1 alias");
        }
        player2_alias = await showCustomPrompt("Player 2, what's your alias?", "Player 2");
    }
    return [player1_alias, player2_alias];
}

export async function set_tourn_alias(tourn_id) {
    let player_alias = await showCustomPrompt(`You have joined tournament ${tourn_id}! Enter your alias for the tournament`, 'Alias', 'Submit');
    
    if (player_alias === null) {
        return null;
    }
    
    const existing_players = await handleFetchErrors(`/pong/tournament/players/all/${tourn_id}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('access')}`
        }
    });
    
    // Check initial alias validity
    let aliasTaken = false;
    
    // Only check for duplicates if there are existing players
    if (existing_players.length > 0) {
        for (let i = 0; i < existing_players.length; i++) {
            if (existing_players[i].alias === player_alias) {
                aliasTaken = true;
                break;
            }
        }
    }
    
    // Enter the loop only if there's an issue with the alias
    while (player_alias.trim() === "" || player_alias.length > 15 || aliasTaken) {
        // console.log(`entering while loop with alias taken: ${aliasTaken}`);
        
        if (player_alias.trim() === "") {
            await showCustomAlert("Player alias must not be empty");
        }
        else if (player_alias.length > 15) {
            await showCustomAlert("Player alias must be less than 15 characters");
        }
        else if (aliasTaken) {
            await showCustomAlert("Alias already taken");
        }
        
        // Get a new alias
        player_alias = await showCustomPrompt("What's your alias?", "Player");
        
        if (player_alias === null) {
            return null;
        }
        
        // Reset aliasTaken flag and check again
        aliasTaken = false;
        
        // Check if the new alias is taken
        if (existing_players.length > 0) {
            for (let i = 0; i < existing_players.length; i++) {
                if (existing_players[i].alias === player_alias) {
                    aliasTaken = true;
                    break;
                }
            }
        }
    }
    
    return player_alias;
}