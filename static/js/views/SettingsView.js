import AbstractView from './AbstractView.js';
import {UserValidation} from "../functions/authentication/validationChecks.js";
import { getUsername } from '../functions/utils/getUsername.js';
import { showCustomAlert } from '../functions/utils/customAlert.js';
import { loadBlockedUsers } from '../functions/block/blockUser.js';
import { handleFetchErrors } from '../functions/utils/HandleFetchErrors.js';

export default class SettingsView extends AbstractView {

    constructor(params = {}) {
        super();
        this.username = '';
        this.isoauth = params.isOauthUser || false;
        this.selectedAvatarFile = null;
        this.originalAvatarSrc = null;
        this.hasChanges = false;
        this.eventListeners = [];
        this.init();
    }

    async init() {

        try {
            this.username = await getUsername() || '';
            await this.loadProfileInfo();
            await loadBlockedUsers(this.username);
        }
        catch (error) { throw error; }
    }

    async loadProfileInfo() {
        const response = await fetch(`/profiles/view/${this.username}/`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access')}`
            },
        });
        
        const data = await response.json();
        
        const avatarElement = document.getElementById('profile-avatar');
        avatarElement.src = data.avatar;
        this.originalAvatarSrc = data.avatar;
        
        document.getElementById('username').textContent = data.user.username + "'s Settings";
    }

    async getHtml() {
        let html = `
        <section class="settings-view">
            <div class="account-container">
                <div class="user-container">
                    <img class="account-img" id="profile-avatar" alt="Photo de profil">
                    <h1 class="settings-username" id="username"></h1>
                </div>
            </div>
        `;

        if (!this.isoauth) {
            html += `
            <section id="upload_settings" class="cyberpunk both">
                <div class="settings-container">
                    <div class="settings-item">
                        <h1>Change Avatar</h1>
                        <input type="file" id="avatar-input" accept="image/*">
                    </div>
                    <div class="settings-item">
                        <h1>Change Password</h1>
                        <input type="password" id="old-password-input" placeholder="Current Password">
                        <input type="password" id="password-input" placeholder="New Password">
                        <input type="password" id="password-confirm-input" placeholder="Confirm Password">
                    </div>
                    <div class="settings-item">
                        <h1>Change Email</h1>
                        <input type="email" id="old-email-input" placeholder="Current E-mail">
                        <input type="email" id="email-input" placeholder="New E-mail">
                    </div>
                    <div class="settings-item">
                        <h1>Change Username</h1>
                        <input type="text" id="username-input" placeholder="New Username">
                    </div>
                    <button id="save-settings-btn" class="cyberpunk purple">Save</button>
                </div>
            </section>
            `;
        } else {
            html += `
            <section id="upload_settings_oauth" class="cyberpunk both">
                <div class="settings-container">
                    <div class="settings-item">
                        <h1>Change Avatar</h1>
                        <input type="file" id="avatar-input" accept="image/*">
                    </div>
                    <div class="settings-item">
                        <h1>Change Username</h1>
                        <input type="text" id="username-input" placeholder="New Username">
                    </div>
                    <button id="save-settings-btn" class="cyberpunk purple">Save</button>
                </div>
            </section>
            `;
        }

        html += `
            <section id="settings-blocked-users" class="cyberpunk black both">
                <div class="boxtree"> 
                    <div class="children2 width1">
                        <h1>Blocked Users</h1>
                        <div id="blocked-users-list"></div>
                    </div>
                </div>
            </section>
        </section>
        `;

        return html;
    }


    async setupEventListeners() {

        // preview avatar listener
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            const avatarChangeHandler = (event) => {
                // console.log("Fichier sélectionné");
                this.previewAvatar(event);
                this.hasChanges = true;
            };
            
            avatarInput.addEventListener('change', avatarChangeHandler);
            this.eventListeners.push({ element: avatarInput, type: 'change', handler: avatarChangeHandler });
        }
        
        // listeners for other inputs
        const inputs = [
            document.getElementById('password-input'),
            document.getElementById('password-confirm-input'),
            document.getElementById('email-input'),
            document.getElementById('username-input')
        ];
        
        inputs.forEach(input => {
            if (input) {
                const inputChangeHandler = () => {
                    if (input.value.trim() !== '') {
                        this.hasChanges = true;
                    }
                };
                
                input.addEventListener('input', inputChangeHandler);
                this.eventListeners.push({ element: input, type: 'input', handler: inputChangeHandler });
            }
        });
        
        // sav button listener
        const saveButton = document.getElementById('save-settings-btn');
        if (saveButton) {
            const saveClickHandler = () => {
                // console.log("Bouton Save cliqué");
                this.saveSettings();
                this.hasChanges = false; 
            };
            
            saveButton.addEventListener('click', saveClickHandler);
            this.eventListeners.push({ element: saveButton, type: 'click', handler: saveClickHandler });
        }
        
    }
    
    hasUnsavedChanges() {
        return this.hasChanges;
    }
    
    previewAvatar(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // saving file for upload
        this.selectedAvatarFile = file;
        
        // preview avatar replacing the current one for trying
        const avatarElement = document.getElementById('profile-avatar');
        
        if (avatarElement) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarElement.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    // when user click SAVE button
    async saveSettings() {

        const validator = new UserValidation();
        let hasSuccessfulUpdate = false;
        let errorMessages = [];
    
        // handles the avatar upload
        if (this.selectedAvatarFile) {
            await this.uploadAvatar();
            hasSuccessfulUpdate = true;
        }

        // password update
        const oldPasswordInput = document.getElementById('old-password-input');
        const passwordInput = document.getElementById('password-input');
        const passwordConfirmInput = document.getElementById('password-confirm-input');

        // Check if user is attempting to update password (any password field has a value)
        const isAttemptingPasswordUpdate = 
            (oldPasswordInput && oldPasswordInput.value.trim() !== '') ||
            (passwordInput && passwordInput.value.trim() !== '') ||
            (passwordConfirmInput && passwordConfirmInput.value.trim() !== '');

        if (isAttemptingPasswordUpdate) {
            // Validate all password fields are filled
            if (!oldPasswordInput || oldPasswordInput.value.trim() === '') {
                errorMessages.push("Current password is required to update password");
            } else if (!passwordInput || passwordInput.value.trim() === '') {
                errorMessages.push("New password is required");
            } else if (!passwordConfirmInput || passwordConfirmInput.value.trim() === '') {
                errorMessages.push("Please confirm your new password");
            } else {

                // first validate the password fields in the frontend before sending to the backend
                const result = await validator.validatePassword(passwordInput.value, passwordConfirmInput.value, this.username);
                const errors = validator.getErrors();
                if (!result) {
                    await showCustomAlert(Object.values(errors)[0]);
                    return;
                }

                // sendind to backend
                const response = await handleFetchErrors('/profiles/update-password/', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('access')}`
                    },
                    body: JSON.stringify({
                        old_password: oldPasswordInput.value,
                        password: passwordInput.value,
                        confirm_password: passwordConfirmInput.value
                    })
                });

                const data = response;
                
                if (data.status === 'success') {
                    hasSuccessfulUpdate = true;
                    // delete fields values
                    oldPasswordInput.value = '';
                    passwordInput.value = '';
                    passwordConfirmInput.value = '';
                } 
            }
        }

        // email update
        const oldEmailInput = document.getElementById('old-email-input');
        const emailInput = document.getElementById('email-input');

        const isAttemptingEmailUpdate = 
            (oldEmailInput && oldEmailInput.value.trim() !== '') ||
            (emailInput && emailInput.value.trim() !== '');

        if (isAttemptingEmailUpdate) {
            // Validate both email fields are filled
            if (!oldEmailInput || oldEmailInput.value.trim() === '') {
                errorMessages.push("Current email is required to update email");
            } else if (!emailInput || emailInput.value.trim() === '') {
                errorMessages.push("New email is required");
            } else {

                // frontend validation
                const result = await validator.validateEmail(emailInput.value);
                const errors = validator.getErrors();
                if (!result) {
                    await showCustomAlert(Object.values(errors)[0]);
                    return;
                }

                // sending to backend
                const response = await handleFetchErrors('/profiles/update-email/', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('access')}`
                    },
                    body: JSON.stringify({
                        old_email: oldEmailInput.value,
                        email: emailInput.value
                    })
                });
                const data = response;
                if (data.status === 'success') {
                    hasSuccessfulUpdate = true;
                    oldEmailInput.value = '';
                    emailInput.value = '';
                } 
            }
        }

        // username update
        const usernameInput = document.getElementById('username-input');
        if (usernameInput && usernameInput.value.trim() !== '') {

            // frontend validation
            const result = await validator.validateUsername(usernameInput.value);
                const errors = validator.getErrors();
                if (!result) {
                    await showCustomAlert(Object.values(errors)[0]);
                    return;
                }

            // sending to backend
            const response = await handleFetchErrors('/profiles/update-username/', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('access')}`
                },
                body: JSON.stringify({
                    username: usernameInput.value
                })
            });

            const data = response;

            if (data.status === 'success') {
                hasSuccessfulUpdate = true;
                usernameInput.value = '';
                
                document.getElementById('username').textContent = data.username + "'s Settings";
                this.username = data.username;
                await this.loadProfileInfo();
            }
        } 

        if (hasSuccessfulUpdate) {
            await showCustomAlert('Settings saved successfully!', 'ok');
        } else if (errorMessages.length > 0) {
            showCustomAlert(errorMessages.join('\n'), 'error');
        }
        else {
            await showCustomAlert('No changes were made.', 'info');
        }

        this.hasChanges = false;
    }
    
    // avatar upload
    async uploadAvatar() {
        if (!this.selectedAvatarFile) return;
        
        try {
            const formData = new FormData();
            formData.append('avatar', this.selectedAvatarFile);
            
            const response = await fetch(`/profiles/upload-avatar/`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('access')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${await response.text()}`);
            }
            
            const data = await response.json();
            
            const avatarImage = document.getElementById('profile-avatar');
            if (avatarImage && data.avatar) {
                avatarImage.src = data.avatar;
            }
            
            this.selectedAvatarFile = null;
            this.originalAvatarSrc = data.avatar;
            
        } catch (error) {}
    }

    cleanup() {

        this.eventListeners.forEach(listener => {
            listener.element.removeEventListener(listener.type, listener.handler);
        });
        
        this.eventListeners = [];
        
    }
}
