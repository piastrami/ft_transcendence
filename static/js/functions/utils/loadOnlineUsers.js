// This function returns a set of online users, excluding the current user
import { getUsername } from "./getUsername.js";
import { handleFetchErrors } from "./HandleFetchErrors.js";

export async function loadOnlineUsers() {
    // Fetch online users
    const onlineData = await handleFetchErrors('/profiles/online/users/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('access')}`
        }
    });
    
    const onlineUsers = new Set(onlineData.online_users); // Assuming this is an array of usernames
    
   // console.log('onlineUsers:', onlineUsers);
    const currentUser = await getUsername();
    onlineUsers.forEach(user => {
        if (user === currentUser) {
            onlineUsers.delete(user);
        }
    });
    return onlineUsers;
}