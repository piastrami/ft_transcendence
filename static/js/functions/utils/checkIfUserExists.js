export async function checkIfUserExists(username) {

  try {
    const response = await fetch(`/profiles/check/${username}/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem(`access`)}`
      },
    });
    
    // console.log('Réponse de checkIfUserExists:', response);
    
    // Vérifier le type de contenu
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      // Si c'est du JSON, essayez de le parser
      try {
        const data = await response.json();
        return data.exists === true;
      } catch (e) {
        // console.log('Erreur de parsing JSON:', e);
        return false;
      }
    } else {
      // Si ce n'est pas du JSON (probablement du HTML), vérifiez simplement le code d'état
      return response.status === 200; // Supposer que 200 = utilisateur existe
    }
  } catch (error) {
    // console.log('Erreur dans checkIfUserExists:', error);
    return false;
  }
}