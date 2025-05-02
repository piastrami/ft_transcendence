export function removeAlertsInCleanup() {
    const customPrompt = document.getElementById('custom-prompt');
    if (customPrompt && typeof customPrompt.cleanup === 'function') {
        customPrompt.cleanup();
    } 
    else if (customPrompt) {
    customPrompt.remove();
    }
    
    const customAlert = document.getElementById('custom-alert');
    if (customAlert && typeof customAlert.cleanup === 'function') {
        customAlert.cleanup();
    } 
    else if (customAlert) {
    customAlert.remove();
    }
    
    const customConfirm = document.getElementById('custom-confirm');
    if (customConfirm && typeof customConfirm.cleanup === 'function') {
        customConfirm.cleanup();
    } 
    else if (customConfirm) {
    customConfirm.remove();
    }
}