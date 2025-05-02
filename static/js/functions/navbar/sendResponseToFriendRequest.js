// Function to send the response to the server (Accept/Reject)
export async function sendResponseToFriendRequest(notificationId, response) {
    const access = sessionStorage.getItem('access');

    // delete user's friend request notification
    if (response === 'accept') {
        // Add the user as a friendship
        await fetch(`/profiles/friendship/accept/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access}`,
                'Content-Type': 'application/json',

            },
            body: JSON.stringify({
                notification_id: notificationId,
            }),
        });
    }
    else if (response === 'reject') {
        // Reject the friend request
        await fetch(`/notifications/friend-request/reject/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            notification_id: notificationId,
            }),
        });
    }
    
}