export async function showCustomAlert(message, button_content) {
    return new Promise((resolve) => {
        let alertBox = document.getElementById('custom-alert');
        if (!alertBox) {
            alertBox = document.createElement('div');
            alertBox.id = 'custom-alert';
            alertBox.classList.add('modal-overlay');

            alertBox.cleanup = () => {
                // console.log('Performing cleanup of custom alert');
                resolve();
                alertBox.remove();
            };

            let content = document.getElementById('alert-content');
            if (!content) {
                content = document.createElement('div');
                content.id = 'alert-content';
                content.className = 'cyberpunk yellow';
                content.classList.add('modal-content')
                content.style.justifyContent = 'center';
            }

            const messageElem = document.createElement('p');
            messageElem.id = 'alert-message';
            messageElem.classList.add('modal-message');
            content.appendChild(messageElem);
            
            const okButton = document.createElement('button');
            okButton.id = 'alert-ok-btn';
            okButton.classList.add('cyberpunk', 'purple');
            okButton.style.alignSelf = 'center';
            okButton.textContent = button_content || 'OK';
            okButton.addEventListener('click', () => {
                resolve();
                alertBox.remove();
            });
            
            content.appendChild(okButton);
            alertBox.appendChild(content);
            document.body.appendChild(alertBox);
        }

        const messageElem = alertBox.querySelector('#alert-message');
        messageElem.textContent = message;  
    })
}
