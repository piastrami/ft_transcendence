import AbstractView from "./AbstractView.js";
import { signin } from "../functions/authentication/signin.js";
import { login42 } from "../functions/authentication/login42.js";
import { setupPasswordReset } from "../functions/authentication/resetPassword.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.boundSignin = null;
        this.boundLogin42 = null;
    }

    async getHtml() {
        return `
            <div id="login-section">
                <div id="login-form">
                    <h3 class="cyberpunk">Login or e-mail</h3>
                    <input id="signin-email-or-username" class="cyberpunk" type="text">
                    <h3 class="cyberpunk">Password</h3>
                    <input id="login-password" class="cyberpunk" type="password">
                    <h4 class="cyberpunk"><a id="forgot-password-link" href="#">Forgot your password?</a></h4>
                    <button id="login-button" class="cyberpunk green">SUBMIT_</button>
                    <button id="login-42" class="cyberpunk blue">Login with 42</button>
                    <p class="signup_link">Don't have an account? <a id="signup_link" class="cyberpunk purple" href="/signup" data-link>Sign up</a></p>
                </div>

                <div id="password-reset-modal" class="password-reset hidden">
                    <h3 class="cyberpunk">Reset Password</h3>
                    <input id="reset-email" class="cyberpunk" type="email" placeholder="Enter your email">
                    <button id="reset-button" class="cyberpunk green">Send Reset Link</button>
                    <button id="close-reset-modal" class="cyberpunk red">Cancel</button>    
                </div>

            </div>`;
    }


    async setupEventListeners() {
        const loginButton = document.getElementById('login-button');
        const login42Button = document.getElementById('login-42');
        
        if (loginButton) {
            this.boundSignin = signin.bind(this);
            loginButton.addEventListener('click', this.boundSignin);
        }
        
        if (login42Button) {
            this.boundLogin42 = login42.bind(this);
            login42Button.addEventListener('click', this.boundLogin42);
        }
        setupPasswordReset();
    }
    
    cleanup() {
        
        const loginButton = document.getElementById('login-button');
        const login42Button = document.getElementById('login-42');
        
        // Supprimer les écouteurs d'événements si les éléments existent
        if (loginButton && this.boundSignin) {
            loginButton.removeEventListener('click', this.boundSignin);
        }
        
        if (login42Button && this.boundLogin42) {
            login42Button.removeEventListener('click', this.boundLogin42);
        }
        
        // Réinitialiser les références
        this.boundSignin = null;
        this.boundLogin42 = null;   
    }
}
