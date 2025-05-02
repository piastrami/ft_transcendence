import { showCustomAlert } from "../utils/customAlert.js";
import { navigateTo } from "../../index.js";

export async function sendResponseToGameRequest(gameId, game_type, message,  status, item) {
    const access = sessionStorage.getItem('access');
    // console.log("gameId insendResponseToGameRequest():", gameId);
    try {
        const response = await fetch(`/notifications/game-request-notif/response/`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access}` 
            },
            body: JSON.stringify({  
                status, 
                gameId,
            })
        });

        const data = await response.json();
        // console.log("data in game notif:", data);

        if (response.ok) {
            // await showCustomAlert(`Game request ${status} successfully!`);

            if (status === 'accepted') {
                // Update UI to show the "Join Game" link (underlined text)
                item.innerHTML = `
                    <p>${message}</p>
                    <span id="game-link-${gameId}" style="display: block; text-decoration: underline; cursor: pointer; color: blue;">
                        Join Game
                    </span>
                    <button class="btn btn-success btn-sm" id="accept-game-btn-${gameId}">Accepted</button>
                    <button class="btn btn-danger btn-sm" id="reject-game-btn-${gameId}">Reject</button>
                `;

                // console.log(" Add the event listener to the 'Join Game' link")
                // document.getElementById(`game-link-${gameId}`).addEventListener('click', () => {
                //     window.location.href = `/${game_type}/${gameId}`;
                // });
                const gameLinkId = document.getElementById(`game-link-${gameId}`);
                if (gameLinkId) {
                    gameLinkId.addEventListener('click', (event) => {
                        event.preventDefault(); // Just in case it's inside a link
                        navigateTo(`/${game_type}/${gameId}`); // Use your SPA navigation system
                    });
                }

                // Add event listener for Reject button
                const rejectGameButtonID = document.getElementById(`reject-game-btn-${gameId}`);
                if (rejectGameButtonID) {
                    rejectGameButtonID.addEventListener('click', async () => {
                        await sendResponseToGameRequest(gameId, game_type, message, 'rejected', item);
                    });
                }

            } else if (status === 'rejected') {
                // Update buttons for the rejected status
                item.innerHTML = `
                    <p>${message}</p>
                    <button class="btn btn-success btn-sm" id="accept-game-btn-${gameId}">Accept</button>
                    <button class="btn btn-secondary btn-sm">Rejected</button>
                `;

                // Add event listener for Accept button
                const acceptGameButtonID = document.getElementById(`accept-game-btn-${gameId}`);
                if (acceptGameButtonID) {
                    acceptGameButtonID.addEventListener('click', async () => {
                        await sendResponseToGameRequest(gameId, game_type, message, 'accepted', item);
                    });
                }
            }
        } else {
            await showCustomAlert(`Error in game request: ${data.error}`);
        }
    } catch (error) {
        // console.log("Error updating game request:", error);
    }
}
