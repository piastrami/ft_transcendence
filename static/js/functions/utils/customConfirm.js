// export function showCustomConfirm(message, callback, false_button_content, true_button_content) {
export async function showCustomConfirm(message, false_button_content, true_button_content, useSpecialBackground = false) {
    return new Promise((resolve) => {
        let alertBox = document.getElementById('custom-confirm');
        
        if (!alertBox) {
            alertBox = document.createElement('div');
            alertBox.id = 'custom-confirm';
            alertBox.className = 'cyberpunk black';
            alertBox.classList.add('modal-overlay');
          

            if (useSpecialBackground) {
                alertBox.style.background = 'transparent';
                alertBox.style.backgroundColor = 'transparent';
                alertBox.classList.add('transparent-bg');
            }
            
            alertBox.cleanup = () => {
                // console.log('Performing cleanup of custom confirm');
                resolve(false);
                alertBox.remove();
            };

            const content = document.createElement('div');
            content.className = 'cyberpunk yellow';
            content.id = 'confirm-content';
            content.classList.add('modal-content');

            let messageElem = document.getElementById('confirm-message');
            if (!messageElem) {
                messageElem = document.createElement('p');
                messageElem.id = 'confirm-message';
                messageElem.classList.add('modal-message');
                messageElem.textContent = message;
                content.appendChild(messageElem);
            }
            
            const yesButton = document.createElement('button');
            yesButton.id = 'confirm-btn';
            yesButton.classList.add('modal-btn');
            yesButton.className = 'cyberpunk purple';
            yesButton.textContent = true_button_content || 'Yes';
            yesButton.addEventListener('click', () => {
                resolve(true);
                alertBox.remove();
            });
            
            const noButton = document.createElement('button');
            noButton.id = 'refuse-btn';
            noButton.classList.add('modal-btn');
            noButton.className = 'cyberpunk purple';
            noButton.textContent = false_button_content || 'No, I changed my mind';
            noButton.addEventListener('click', () => {
                resolve(false);
                alertBox.remove();
            });
                
            // Create a container for the buttons and align them
            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'custom-btn-container';
            buttonContainer.classList.add('modal-btn-container');
            buttonContainer.style.marginTop = '20px';
            
            buttonContainer.appendChild(noButton);
            buttonContainer.appendChild(yesButton);
            
            content.appendChild(buttonContainer);
            alertBox.appendChild(content);
            document.body.appendChild(alertBox);
        }
    });
}
