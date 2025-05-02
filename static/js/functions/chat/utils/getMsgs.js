export async function getMsgs(roomName) {
    let access = sessionStorage.getItem(`access`);
    // console.log('get messages from db in getMsgs()');
    
    const response = await fetch(`/chat/messages/${roomName}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        // console.log('Error response:', errorData);
        throw new Error(`Failed to load messages: ${response.status}`);
    }
    else 
    {
        // Parse the response data
        const data = await response.json();
        const messages = data.messages;
        return messages;
    }
        
    
}