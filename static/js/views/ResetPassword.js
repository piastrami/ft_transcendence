import { getIp } from "../functions/game/getIp.js";
import { navigateTo } from "../index.js";
import AbstractView from "./AbstractView.js";
import { showCustomAlert } from '../functions/utils/customAlert.js';

export default class extends AbstractView {
    constructor(token) {
        super();
        this.token = token; // Token is passed in from the URL
    }

    async getHtml() {
        if (!this.token) {
            return this.getInvalidResetHtml();
        }
    
        // Verify if the token is valid before showing the form
        try {
            const ip = await getIp();
            const response = await fetch(`https://${ip}:8000/password-reset-validate/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: this.token }),
            });
    
            if (!response.ok) {
                return this.getInvalidResetHtml();
            }
        } catch (error) {
            // console.log("Error validating token:", error);
            return this.getInvalidResetHtml();
        }
    
        return `
            <div id="reset-password-section">
                <div id="reset-password-form">
                    <h3 class="cyberpunk">Reset Password</h3>
                    <input id="new-password" class="cyberpunk" type="password" placeholder="Enter new password">
                    <input id="confirm-password" class="cyberpunk" type="password" placeholder="Confirm new password">
                    <button id="reset-password-button" class="cyberpunk green">Reset Password</button>
                </div>
            </div>`;
    }
    
    getInvalidResetHtml() {
        return `
            <div id="reset-password-section">
                <div id="reset-password-form">
                    <h3 class="cyberpunk">Invalid Link</h3>
                    <p>The password reset link is invalid or has expired.</p>
                    <button id="back-to-login" class="cyberpunk green">Back to Login</button>
                </div>
            </div>`;
    }
    

    async setupEventListeners() {
        // If the token is invalid, set up the back to login button
        const backToLoginBtn = document.getElementById('back-to-login');
        if (backToLoginBtn) {
            backToLoginBtn.addEventListener('click', () => {
                navigateTo("/signin");
            });
            return; // Exit since we don't have a valid token
        }
        
        // Set up the reset password button
        document.getElementById('reset-password-button').addEventListener('click', async () => {
            // const oldPassword = document.getElementById('old-password').value.trim();
            const newPassword = document.getElementById('new-password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();
            
            if (!newPassword || !confirmPassword) {
                await showCustomAlert("Please fill in all password fields.");
                return;
            }
            if (newPassword !== confirmPassword) {
                await showCustomAlert("Passwords do not match.");
                return;
            }
            if (newPassword.length < 6) {
                await showCustomAlert("Password must be at least 6 characters.");
                return;
            }

            try {
                // Change from HTTPS to HTTP for local development
                const ip = await getIp();
                const response = await fetch(`https://${ip}:8000/password-reset-confirm/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        token: this.token,
                        new_password: newPassword,
                        confirm_password: confirmPassword 
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    await showCustomAlert("Password reset successful! You can now log in.");
                    navigateTo("/signin");
                } else {
                    // Try to parse error message but don't fail if it's not valid JSON
                    try {
                        const errorData = await response.json();
                        await showCustomAlert(errorData.message || errorData.error || "Failed to reset password. Please try again.");
                    } catch (e) {
                        await showCustomAlert("Failed to reset password. The link may have expired.");
                    }
                }
            } catch (error) {
                // console.log("Error:", error);
                await showCustomAlert("Connection error. Please check your internet connection and try again.");
            }
        });
    }
}