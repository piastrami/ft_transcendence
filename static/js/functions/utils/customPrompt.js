import { positionAlertRelativeToChat } from "./positionAlertRelativeToChat.js";

export async function showCustomPrompt(message, placeholder, buttonContent) {
    return new Promise((resolve) => {
        // Create prompt box
        let promptBox = document.createElement('div');
        promptBox.id = 'custom-prompt';
        promptBox.className = 'cyberpunk black modal-overlay';

        // Create content
        const content = document.createElement('div');
        content.id = 'prompt-content';
        content.className = 'cyberpunk yellow modal-content';

        promptBox.cleanup = () => {
            // console.log('Performing cleanup of custom alert');
            resolve(null);
            promptBox.remove();
        };
        
        // Create message
        const messageElem = document.createElement('p');
        messageElem.id = 'prompt-message';
        messageElem.className = 'modal-message';
        messageElem.textContent = message;
        content.appendChild(messageElem);

        // Create input
        const input = document.createElement('input');
        input.id = 'prompt-input';
        input.type = 'text';
        input.placeholder = placeholder || '';
        input.className = 'modal-input';
        content.appendChild(input);

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'prompt-btn-container';
        buttonContainer.className = 'modal-btn-container';

        // Create submit button
        const submitButton = document.createElement('button');
        submitButton.id = 'prompt-submit-btn';
        submitButton.className = 'cyberpunk purple';
        submitButton.textContent = buttonContent || 'Submit';
        submitButton.addEventListener('click', () => {
            resolve(input.value);
            promptBox.remove();
        });

        // Append elements
        buttonContainer.appendChild(submitButton);
        content.appendChild(buttonContainer);
        promptBox.appendChild(content);
        document.body.appendChild(promptBox);

        // Position the alert based on chat state
        positionAlertRelativeToChat(promptBox);
    });
}