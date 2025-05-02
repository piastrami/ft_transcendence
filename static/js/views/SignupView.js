import AbstractView from "./AbstractView.js";
import { signup } from "../functions/authentication/signup.js";
import { login42 } from "../functions/authentication/login42.js";
import { showCustomAlert } from "../functions/utils/customAlert.js";

export default class extends AbstractView {
    constructor() {
        super();
    }

    async getHtml() {
        return `
            <div id="login-section">
            <div id="login-form">
                <h3 class="cyberpunk">Login</h3>
                <input id="signup-username" class="cyberpunk" type="text">
                <h3 class="cyberpunk glitched">E-mail</h3>
                <input id="signup-email" class="cyberpunk" type="text">
                <h3 class="cyberpunk glitched">Password</h3>
                <input id="signup-password-confirm" class="cyberpunk" type="password">
                <h3 class="cyberpunk">Confirm Password</h3>
                <input id="signup-password" class="cyberpunk" type="password">
                <button id="signup-button" class="cyberpunk green">CREATE_</button>
                <button id="login-42" class="cyberpunk blue">Sign up with 42</button>
                <p class="signup_link">Already have an account? <a id="signup_link" class="cyberpunk purple" href="/signin" data-link>Sign in</a></p>
            </div>     
        </div>`;
    }
    
    async setupEventListeners() {
        const urlParams = new URLSearchParams(window.location.search);
        if (location.pathname === '/signup' && urlParams.get('oauth_error') === 'user_exists') {
            await showCustomAlert('Please signup with a different username and email.');
            return;
        }

        const signupButton = document.getElementById('signup-button');
        const login42Button = document.getElementById('login-42');

        if (signupButton) {
            signupButton.addEventListener('click', signup);
        }
        if (login42Button) {
            login42Button.addEventListener('click', login42);
        }
    }

}