import AbstractView from "../views/AbstractView.js";
import { navigateTo } from '../index.js';

export class ErrorView extends AbstractView {
    constructor(title = "Error", message = "An error occurred.") {
        super();
        this.title = title;
        this.message = message;
    }

    async getHtml() {
        return `
        <div class="error-container">
            <h1>${this.title}</h1>
            <p>${this.message}</p>
            <button id="error-button" class="cyberpunk green">Return to profile</button>
        </div>
        `;
    }

    async setupEventListeners() {
        const button = document.getElementById('error-button');
        if (button) {
            button.addEventListener('click', () => {
                navigateTo('/profile');
            });
        }
    }
}

export class NotFoundView extends ErrorView {
    constructor() {
        super("404 - Not Found", "The page you are looking for does not exist.");
    }
}

export class ServerErrorView extends ErrorView {
    constructor() {
        super("500 - Server Error", "A server error occurred.");
    }
}

export class ForbiddenView extends ErrorView {
    constructor() {
        super("403 - Forbidden", "You do not have permission to access this page.");
    }
}

