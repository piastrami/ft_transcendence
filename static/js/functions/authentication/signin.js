import { navigateTo, router } from '../../index.js'; 
import { showCustomAlert } from '../utils/customAlert.js';
import { handleFetchErrors } from '../utils/HandleFetchErrors.js';

export async function signin() {

    const email_or_username = document.getElementById('signin-email-or-username').value;
    const password = document.getElementById('login-password').value;

    try {
       
        const data = await handleFetchErrors('/authentication/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email_or_username, password }),
            credentials: 'include',
        });
        
        const redirectUrl = data.redirect_url || '/otp';
        if (data.status === 'pending_otp') {
            sessionStorage.setItem('temp_username', data.username);
            navigateTo(redirectUrl);
        }

    } catch (error) {
        await showCustomAlert('An error occurred while processing your request. Please try again later.', 'OK');
    }
}
