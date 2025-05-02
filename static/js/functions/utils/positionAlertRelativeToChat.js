export function positionAlertRelativeToChat(alertBox) {
    // Get the chat element and check if it's open
    const chatElement = document.querySelector('#main-chat-window');
    const isChatOpen = sessionStorage.getItem('chatOpen') === 'true';
    
    // Get the modal content element inside the alert box
    const modalContent = alertBox.querySelector('.modal-content');
    
    if (!modalContent) {
        // console.log('Modal content not found in alert box');
        return;
    }
    
    if (isChatOpen && chatElement) {
        // console.log('Chat is open, positioning alert above chat');
        
        // Get the chat position
        const chatRect = chatElement.getBoundingClientRect();
        
        // Calculate the available space above the chat
        const availableHeight = chatRect.top;
        
        // Position the alert box in the center of the screen
        alertBox.style.position = 'fixed';
        alertBox.style.top = '0';
        alertBox.style.left = '0';
        alertBox.style.width = '100%';
        alertBox.style.height = '100%';
        alertBox.style.display = 'flex';
        alertBox.style.justifyContent = 'center';
        alertBox.style.alignItems = 'flex-start';
        alertBox.style.paddingTop = Math.max(20, availableHeight / 3) + 'px';
        
        // Add a class for additional styling
        alertBox.classList.add('chat-open');
        alertBox.classList.remove('chat-closed');
    } else {
        // console.log('Chat is closed, positioning alert in center');
        
        // Center the alert box
        alertBox.style.position = 'fixed';
        alertBox.style.top = '0';
        alertBox.style.left = '0';
        alertBox.style.width = '100%';
        alertBox.style.height = '100%';
        alertBox.style.display = 'flex';
        alertBox.style.justifyContent = 'center';
        alertBox.style.alignItems = 'center';
        alertBox.style.paddingTop = '0';
        
        // Add a class for additional styling
        alertBox.classList.add('chat-closed');
        alertBox.classList.remove('chat-open');
    }
}