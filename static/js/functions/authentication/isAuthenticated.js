export async function refreshToken() {

    const refresh = sessionStorage.getItem('refresh');
    //console.log('refresh token:', refresh);
    
    if (!refresh) {
      // No refresh token available, user needs to log in again
      //console.log('No refresh token available. User needs to login again.');
      return false;
    }
    
    try {
      const response = await fetch('/authentication/refresh-token/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh: refresh
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      
      // Save the new tokens
      sessionStorage.setItem('access', data.access);
      // Some APIs also return a new refresh token, update if provided
      if (data.refresh) {
        sessionStorage.setItem('refresh', data.refresh);
      }
      
      return true;
    } catch (error) {
      //console.error('Error refreshing token:', error);
      // Clear tokens as they are invalid
      sessionStorage.removeItem('access');
      sessionStorage.removeItem('refresh');
      return false;
    }
  }
  

export async function isAuthenticated() {

    const access = sessionStorage.getItem('access');
    if (access !== null) {

        try {
            const response = await fetch('/authentication/verify-jwt/', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem(`access`)}`
                },
            }); 
            if (!response.ok) {
                console.log('access expired, refreshing token...');
                const result = await refreshToken();
                if (result) {
                    return true;
                }
                else {
                    sessionStorage.removeItem('access');
                    sessionStorage.removeItem('refresh');
                    return false;
                }
                //throw new Error(response.statusText);
            }
            else { return true; }
        }
        catch (error) {
            console.error('Error verifying JWT:', error);
            return false;
        }
    }
    else { return false; }
}