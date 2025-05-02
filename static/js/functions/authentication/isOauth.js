export async function isOauth() {
    
    try {
        const response = await fetch('/authentication/is_oauth/', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem(`access`)}`
              },
        }); 
        
        // verifies if response it json or not
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // if it's json
          try {
            const data = await response.json();
            return data.oauth === true;
          } catch (e) {
            return false;
          }
        } else { return response.status === 200; }
    } catch (error) { return false; }
}