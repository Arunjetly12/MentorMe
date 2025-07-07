// assets/js/notifications.js

// Request notification permission (can be called from anywhere)
export async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        try {
            await Notification.requestPermission();
        } catch (e) {
            console.error('Notification permission error:', e);
        }
    }
}

// Show a notification via the service worker
export function showNotification(title, body) {
    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(function(registration) {
            registration.active.postMessage({
                type: 'SHOW_NOTIFICATION',
                title: title,
                body: body
            });
        });
    }
}

// Example usage (uncomment to test):
// requestNotificationPermission();
// showNotification('Test Notification', 'This is a test notification from notifications.js');