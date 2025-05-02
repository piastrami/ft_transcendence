import { navigateTo } from "../../index.js";

export const login42 = async () => {
    window.location.href = '/o/login_42/';
    await handleOAuthCallback();
};

export const handleOAuthCallback = async () => {
    // console.log("handleOAuthCallback() is running...");
    const urlParams = new URLSearchParams(window.location.search);

    const code = urlParams.get('code');
    // console.log("OAuth Code:", code);

    if (code) {
        try {
            const response = await fetch(`/authentication/o/login_42/?code=${code}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                // console.log("HTTP error:", response.status);
                throw new Error(`HTTP error: ${response.status}`);
            }
            

            const data = await response.json();
            // console.log("Response from backend:", data);

            const { status, access_token, username, redirect_url } = data;
            if (data.status === 'success') {
                sessionStorage.setItem('temp_access', access_token);
                sessionStorage.setItem('temp_username', username);
                // console.log("Stored username in sessionStorage:", username);
                // window.location.href = redirect_url;
                if (redirect_url) {
                    // console.log("Redirecting to:", redirect_url);
                    //window.location.href = redirect_url; // Perform the redirect
                    navigateTo(redirect_url);
                } else {
                    // console.log("No redirect URL provided!");
                }
            } else {
                // console.log("Login failed:", data.message);
            }
        } catch (error) {
            // console.log("OAuth callback error:", error);
        }
    }
};
