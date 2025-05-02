export async function getUsername() {

    try {
        const response = await fetch('/profiles/username/', {
            method: 'GET',
            credentials: 'include', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem(`access`)}`
            },
        });

        if (!response.ok) {
            
            if (response.status === 401 || response.status === 403) {
                // console.log('Token invalide ou expiré');
                // sessionStorage.removeItem('access');
                // sessionStorage.removeItem('refresh');
                return null;
            }
            else {
                // console.log('Erreur dans getUsername:', response);
                throw new Error(`HTTP Error! Status: ${response.status}`);
            }
        }
        
        // console.log('Réponse:', response);
        const data = await response.json();
        // console.log('Données utilisateur:', data);
        return data.username; 
    } catch (error) {
        // console.log('Erreur dans getUsername:', error);
        return null;
    }
}

// export async function loadUserSession() {
//     const currentUser = getUsername();

//     if (currentUser) {
//         // Load the tokens for the current user based on their unique username
//         const accessToken = sessionStorage.getItem(`access`);
//         const refreshToken = sessionStorage.getItem(`refresh`);

//         if (accessToken && refreshToken && currentUser) {
//             // Proceed with the session, connect to WebSocket, etc.
//             console.log(`Logged in as ${currentUser} with token [[[ ${accessToken} ]]]` );
//         } else {
//             // Handle missing tokens or session data (redirect to login)
//             console.log('Session data not found. Please log in again.');
//         }
//     } else {
//         // Handle the case when no user is logged in
//         console.log('No user logged in.');
//     }
// }
