import { getIp } from "../game/getIp.js";
import { showCustomAlert } from "../utils/customAlert.js";

export function setupPasswordReset() {
    // Forgot Password - Show Modal
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {   
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('password-reset-modal');
            if (modal) {
                modal.classList.remove('hidden');
                // Scroll to the modal
                modal.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            setTimeout(() => {
                document.getElementById('reset-email').focus();
            }, 300);
        });
    }


    // Close Password Reset Modal
    const closeResetModal = document.getElementById('close-reset-modal');
    if (closeResetModal) {
        closeResetModal.addEventListener('click', () => {
            const passwordResetModal = document.getElementById('password-reset-modal');
            if (passwordResetModal) {
                passwordResetModal.classList.add('hidden');
            }
        });
    }

    // Send Password Reset Request
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            const email = document.getElementById('reset-email').value.trim();
            if (!email) {
                await showCustomAlert("Please enter your email.");
                return;
            }
    
            try {
                const ip = await getIp();
                const resetUrl = `https://${ip}:8000/reset-password/`; 
                const response = await fetch(resetUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email: email }),
                });
    
                const data = await response.json();
                if (data.status === 'success') {
                    await showCustomAlert("Password reset link sent. Check your email.");
                    document.getElementById('password-reset-modal').classList.add('hidden');
                } else if (data.status === 'error') {
                    await showCustomAlert(data.message || "Failed to send reset link.");
                }
            } catch (error) {
                // console.log("Error:", error);
                await showCustomAlert("Something went wrong.");
            }
        });
      
    }
}
