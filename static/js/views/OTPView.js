import AbstractView from "./AbstractView.js";
import { navigateTo, router } from '../index.js';
import { getNavbar } from '../functions/navbar/Navbar.js';

export default class extends AbstractView {
   constructor() {
        super();
        
        const urlParams = new URLSearchParams(window.location.search);
        const usernameFromURL = urlParams.get('username');
    
        if (usernameFromURL) {
            sessionStorage.setItem('temp_username', usernameFromURL);
        } else if (!sessionStorage.getItem('temp_username')) {
            navigateTo('/signin');
            return '';
        } else {
            // console.log("OTP View initialized with username:", sessionStorage.getItem('temp_username'));
        }
    }

    async getHtml() {

        return `
        <div id="otp-section" class="cyberpunk">
            <div id="otp-form">
                <h3 class="cyberpunk glitched">OTP Verification</h3>
                
                <div>
                    <p>A verification code has been sent to your email.</p>
                    <p class="text-sm">Please enter it below to complete your login.</p>
                </div>

                <input id="otp-code" type="text" maxlength="6" placeholder="Enter 6-digit code" autocomplete="off">
                <div id="error-message-otp" class="hidden"></div>
                
                <button id="otp-button" class="cyberpunk green">VERIFY_</button>
                <button id="resend-otp" class="cyberpunk blue">RESEND_</button>

                <div id="countdown">
                    Code expires in: <span id="timer">05:00</span>s
                </div>

            </div>     
        </div>`;
    }

    startCountdown() {
        const timerElement = document.getElementById('timer');
        let timeLeft = 300; // 5 minutes
    
        const countdownInterval = setInterval(() => {
            let minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            seconds = seconds < 10 ? "0" + seconds : seconds;
    
            if (timerElement) {
                timerElement.textContent = `${minutes}:${seconds}`;
            }
    
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                const resendElement = document.getElementById('resend-otp');
                if (resendElement)
                    document.getElementById('resend-otp').disabled = false;
                if(timerElement)
                    timerElement.parentElement.textContent = 'Code expired. Please request a new one.';
            }
    
            timeLeft--;
        }, 1000);
    
        return countdownInterval;
    }
    

    showError(message) {
        const errorDiv = document.getElementById('error-message-otp');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(() => errorDiv.classList.add('hidden'), 5000);
    }

    async handleOTPVerification() {
        const otpInput = document.getElementById('otp-code');
        const otp = otpInput.value;
        const username = sessionStorage.getItem('temp_username');
        const tempAccess = sessionStorage.getItem('temp_access');
    
        if (!otp || otp.length !== 6) {
            this.showError('Please enter a valid 6-digit code');
            return;
        }
    
        try {
            const response = await fetch('/authentication/otp/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include temporary access token if available
                    ...(tempAccess && { 'Authorization': `Bearer ${tempAccess}` })
                },
                body: JSON.stringify({ otp, username }),
                credentials: 'include'
            });
    
            const data = await response.json();
            // let currentUsername = getUsername();

            if (response.ok) {
                // Clear temporary data
                sessionStorage.removeItem('temp_username');
                sessionStorage.removeItem('temp_access');
                
                // Store tokens
                sessionStorage.setItem('access', data.access);
                sessionStorage.setItem('refresh', data.refresh);
                
                // Wait briefly to ensure tokens are stored
                await new Promise(resolve => setTimeout(resolve, 100));
                
                navigateTo('/profile');
                const navbar = getNavbar();
                // console.log(navbar.ws.getSocketStatus());
                await navbar.update();
                // console.log(navbar.ws.getSocketStatus());
                sessionStorage.setItem('chatOpen', 'false');
                sessionStorage.setItem('indivChatOpen', 'false');

            } else {
                this.showError(data.error || 'Verification failed. Please try again.');
            }
        } catch (error) {
            // console.log('Error:', error);
            this.showError('An error occurred. Please try again.');
        }
    }

    setupEventListeners() {
        // console.log("Setting up OTP event listeners");
        // Wait for the page to load fully before attaching event listeners
        // window.addEventListener('DOMContentLoaded', () => {
        let countdownInterval = this.startCountdown();

        const otpButton = document.getElementById('otp-button');
        const resendButton = document.getElementById('resend-otp');

        if (otpButton && resendButton) {
            otpButton.addEventListener('click', async () => {
                await this.handleOTPVerification();
            });

            resendButton.addEventListener('click', async () => {
                const username = sessionStorage.getItem('temp_username');
                try {
                    const response = await fetch('/authentication/login/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email_or_username: username, resend_otp: true })
                    });

                    const data = await response.json();

                    if (data.status === 'pending_otp') {
                        clearInterval(countdownInterval);
                        countdownInterval = this.startCountdown();
                        this.showError('New code sent to your email');
                    } else {
                        this.showError('Failed to send new code. Please try again.');
                    }
                } catch (error) {
                    // console.log('Error: Resending code', error);
                    this.showError('An error occurred. Please try again.');
                }
            });
        } else {
            // Retry or handle case where elements are not yet available
            // console.warn("OTP elements not found yet");
        }
    }
}
