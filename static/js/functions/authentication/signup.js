import { handleFetchErrors } from "../utils/HandleFetchErrors.js";
import {UserValidation} from "./validationChecks.js";
import { showCustomAlert } from "../utils/customAlert.js";
import { navigateTo } from "../../index.js";

export async function signup() {
    const email = document.getElementById('signup-email').value;
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const password2 = document.getElementById('signup-password-confirm').value;

    try {
        try {
            const validator = new UserValidation();
            await validator.init();
            const results = await validator.validateAll(username, email, password, password2);
            if (!results.isValid)
            {
                const firstErrorField = Object.keys(results.errors)[0];
                await showCustomAlert(results.errors[firstErrorField][0]);
                return;
            }
        }
        catch (error) {
            // console.log('Error during validation:', error);
            return;
        }
        const responseData = await handleFetchErrors('/authentication/register/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, username, password, password2 })
        });
        // Message from django: user {username} successfully created
        if (responseData && responseData.message) {
            const msgFromServer = JSON.stringify(responseData.message);
            if (msgFromServer.includes("successfully created")) {
                await showCustomAlert(`Registration successful: ${responseData.message}`);
                navigateTo('/signin');
            }
        }
        else {
            // console.log(`responseData: ${responseData.message}`);
        }
    }
    catch (error) {
        await showCustomAlert(error.message, 'Try again');
        // console.log('Error during fetch:', error.message);
    }
}    

