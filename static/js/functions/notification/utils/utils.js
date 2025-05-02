import { showCustomAlert } from '../../utils/customAlert.js';
import { getUsername } from '../../utils/getUsername.js';

// Function to handle the accept/reject button click

export async function handleInviteNotifResponse (gameId, game_type, status, acceptButton, rejectButton) {
    // console.log("handleInviteNotifResponse() called");
    
    const access = sessionStorage.getItem(`access`);
    
    if (!acceptButton) {
        acceptButton = document.getElementById('accept-btn');
    }
    if (!rejectButton) {
        rejectButton = document.getElementById('reject-btn');
    }
    //DEBUG===========
    // // console.log('Access Token handleInviteNotifResponse ():', access); // Debugging
    // // console.log('status handleInviteNotifResponse ():', status); // Debugging
    // // console.log('gameID handleInviteNotifResponse ():', gameId); // Debugging
    //===========DEBUG
    try {
        // const gameLink = acceptButton.closest('li').querySelector('a');
        // console.log('gameID after try handleInviteNotifResponse():', gameId); // Debugging

        if (gameId){
            let resualt = null;
            if (game_type == "pong") {
                // console.log("Fetching pong game session 1v1 with gameId :", gameId);
                resualt = await fetch(`/pong/game_session/${gameId}/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${access}`,
                    }
                });
            }
            else if (game_type == "tournament") {
                // console.log("Fetching pong tournament with tournament id :", gameId);
                resualt = await fetch(`/pong/tournament/info/${gameId}/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${access}`,
                    }
                });
            }
            const game_db = await resualt.json();
            if (!resualt.ok)
            {

                //DEBUG===========
                // // console.log("game db:", game_db);
                // // console.log("game_active from game db:", game_db.is_active);
                // // console.log("player1_id:", game_db.player1_id);
                // // console.log("player2_id:", game_db.player2_id);
                //===========DEBUG
                
                acceptButton.disabled = true;
                rejectButton.disabled = true;
                await showCustomAlert("This game does not exist!");
            } else {
                const response = await fetch(`/notifications/game-request-notif/` , {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${access}`,
                        "X-GameId": data.game_id // Custom header
                    }
                });
                // console.log("response in gamenotifrequest db: ", response);
        
                const data = await response.json();
                if (response.ok) {
                    //DEBUG===========
                    // console.log("gamenotifrequest db: ", data);
                    if (data.length > 0) {
                        // console.log("status in gamenotifrequest db: ", data[0].status);
                    } else {
                        // console.log("No game notif request found.");
                    }
                    //===========DEBUG
        
                    // if(data[0].status === 'autorejected') // i think i dont need to check this part if game has been deleted from game db
                    if(data[0].status === 'autorejected') // accepted, pending => autorejected but when game db is created
                    {
                        acceptButton.textContent = 'Accepte';
                        // acceptButton.disabled = true;
                        rejectButton.textContent = 'AutoRejected';
                        // rejectButton.disabled = true;
                        await showCustomAlert("This game does not exist it is rejected automatically!");
                    } else {
                        try {
                            const response = await fetch(`/notifications/game-request-notif/response/`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${access}` 
                                },
                                body: JSON.stringify({  
                                    status, 
                                    // game_type, 
                                    gameId,
                                })
                            });
                    
                            const data = await response.json();
                    
                            if (response.ok) {
                                // await showCustomAlert(`Game notif request ${status} successfully!`);
                                // console.log("Game notif request updated successfully:", data.message);
                                // console.log("data of Game notif request :", data);
                                // Optionally, update the UI here
                            } else {
                                // await showCustomAlert(`Error in game notif: ${data.error}`);
                                // console.log("Error updating game notif request:", data.error);
                            }
                        } catch (error) {
                            // console.log("Error updating game notif request:", error);
                        }
                        // const gameLink = acceptButton.closest('li').querySelector('a');
                        if(status === 'accepted') {
                            // Change the buttons' text 
                            acceptButton.textContent = 'Accepted';
                            // console.log("%caccepted button: ", "color: purple", status);
                            // Disable buttons so they cannot be clicked again
                            acceptButton.disabled = true;
                            rejectButton.textContent = 'Reject';
                            rejectButton.disabled = false;
                    
                            // 🔥 Show the game link immediately after accepting
                            // if (gameLink) {
                            //     gameLink.style.display = 'inline';
                            // }
                        } else if(status === 'Rejected'){
                            rejectButton.textContent = 'Rejected';
                            rejectButton.disabled = true;
                            acceptButton.textContent = 'Accept';
                            acceptButton.disabled = false;
                            // gameLink.style.display = 'none';
                        }
                    }
                    // update the UI here
                } else {
                    await showCustomAlert(`Error notif game: ${data.error}`);
                }
            }
        }else
            await showCustomAlert(`this game does not exist!`);

    } catch (error){
        // console.log("Error game id", error);
    }
 
}


// export async function deletegamenotif(gameId, notificationPopup)
export async function deletegamenotif(gameId)
{
    const currentUser = await getUsername();
    const token = sessionStorage.getItem("access"); // Adjust if needed
    // console.log("deletegamenotif() called gameId: ", gameId);
    
    try {
        if (gameId){
            try {
                const response = await fetch(`/notifications/game-request-notif/response/`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ gameId: gameId })
                });

                const data = await response.json();

                if (response.ok) {
                    // console.log("Game notif request deleted successfully:", data.message);
                    // await showCustomAlert("Game request deleted successfully!");
                    // notificationPopup.remove();
                } else {
                    // console.log("Error deleting game notif request:", data.error);
                    // await showCustomAlert(`Error: ${data.error}`);
                }
            } catch (error) {
                // console.log("Network error in game notif:", error);
                // await showCustomAlert("Failed to delete game request. Please try again.");
            }
        }
    }
    catch (error) {
            // console.log("Error fetching game notifications:", error);
        }
}

