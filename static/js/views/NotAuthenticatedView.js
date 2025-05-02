import { navigateTo } from "../index.js";
import AbstractView from "./AbstractView.js";
import { showCustomConfirm } from "../functions/utils/customConfirm.js";

export default class extends AbstractView {
    constructor() {
        // the super constructor calls the constructor of the parent class
        super();
        this.ws = null;
        this.init();
    }

    async init() {
        const hasAnAccount = await showCustomConfirm("You need to be logged in to see this page.", "I don't have an account", "Sign in", true);
        if (hasAnAccount) {
            navigateTo('/signin');
            return;
        }
        else {
            navigateTo('/signup');
            return;
        }
    }

    async getHtml() {

        const div_app = document.getElementById('app');
        div_app.style.display = 'none';

        return ``;
    }

    async setupEventListeners() {
    }

    cleanup() {
        const div_app = document.getElementById('app');
        div_app.style.display = 'block';
    }
}