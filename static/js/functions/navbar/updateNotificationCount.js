export function updateNotificationCount() {
    // console.log('updateNotificationCount()');
    
    const currentCount = parseInt(document.getElementById('notificationCount').textContent);
    const newCount = currentCount - 1;
    document.getElementById('notificationCount').textContent = newCount > 0 ? newCount : 0; // Ensure the count doesn't go negative
}