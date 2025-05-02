
//In order for this function to correctly parse the error messages from the server, the server must return the error messages as a dictionary with key 'field' and value 'message'. An example:
    // formatted_errors = {}
    // for field, messages in e.detail.items():
    //     formatted_errors[field] = ", ".join(messages)
    // return Response({
    //     'status': 'error',
    //     'message': formatted_errors,
    // }, status=status.HTTP_400_BAD_REQUEST)

import { navigateTo } from '../../index.js';
import { showCustomAlert } from './customAlert.js';

// Cette fonction gère les erreurs de fetch en utilisant l'approche status 200 avec error_code
// Le serveur renvoie toujours 200 OK mais inclut un status:"error" et un error_code dans le corps
export async function handleFetchErrors(url, options = {}) {
    const response = await fetch(url, {
        method: options.method || 'GET', // Default to GET if no method is specified
        headers: {
            ...options.headers, // Merge user-provided headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: options.credentials || 'same-origin', // Default to 'same-origin'
        ...options, // Include other fetch options like mode, cache, etc.
    });

    // Check the content type of the response
    const contentType = response.headers.get('Content-Type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
        try {
            // Try to parse the JSON response
            data = await response.json();
        } catch (error) {
            // Handle case where the response is not valid JSON
            // console.log("Error parsing JSON:", error);
        }
    } else {
        // If the response is not JSON, handle it as text or other formats
        const text = await response.text();
        // console.log("Non-JSON response:", text);
        // console.log("Non-JSON response:", text);
        data = { message: "An unexpected error occurred" }; // Provide the text as part of the error message
    }

    // Vérifier les erreurs au niveau de l'API (status === 'error' ou error_code existe)
    if (data && (data.status === 'error' || data.error_code)) {
        const errorMessage = data.message;
        let displayMessage = '';
        
        if (typeof errorMessage === 'object') {
            for (const [field, message] of Object.entries(errorMessage)) {
                let fieldError = null;
                if (field === "non_field_errors")
                    fieldError = "";
                else {
                    fieldError = `${field}: `;
                }
                
                if (Array.isArray(message)) {
                    fieldError += message.join(' ');
                } else if (typeof message === 'object') {
                    fieldError += JSON.stringify(message);
                } else {
                    fieldError += message;
                }
                displayMessage += fieldError + '\n';
            }
            displayMessage = displayMessage.trim();
        } else {
            displayMessage = `Oops! ${errorMessage}`;
        }
        
        let button_content = 'Try again';
        
        // Utiliser error_code au lieu de response.status
        const errorCode = data.error_code;
        switch (errorCode) {
            case 404:
            case 403:
            case 500:
                button_content = 'OK';
                navigateTo(`/${errorCode}`);
                break;
            default:
                break;
        }
        
        await showCustomAlert(displayMessage, button_content);
        // console.log(`API Error: ${displayMessage}`); // Utiliser "API Error" pour distinguer
    }
    
    return data;
}
                