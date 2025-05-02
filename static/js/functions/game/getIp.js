export async function getIp() {
    // console.log("getIp() called");
    // Récupère les informations du serveur via l'API

    // not a sensible information does not need to be protected and is used when forgot password and user has no jwt yet
    const response = await fetch('/pong/get_ip/');
    
    const data = await response.json();
    // Retourne directement la valeur de l'IP au lieu de l'objet complet
    // console.log("getIp() returned", data.ip);
    return data.ip;
}