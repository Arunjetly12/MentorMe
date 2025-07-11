// sw.js - The Service Worker

const CACHE_NAME = 'neet-mentor-v1';
// Add all the files that are essential for your app to run
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/tracker.html',
    '/reminders.html',
    '/motivation.html',
    '/revision.html',
    '/tools.html',
    '/auth.html',
    '/account.html',
    '/css/style.css',
    '/css/auth.css',
    '/css/account.css',
    '/js/supabase-client.js',
    '/js/index.js',
    '/js/script.js',
    '/js/auth.js',
    '/js/account.js',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
    '/assets/google-icon.svg',
    '/assets/default-avatar.png'
];

// Badge management
let currentBadgeCount = 0;

// Function to update app icon badge
async function updateBadge(count) {
    if ('setAppBadge' in navigator) {
        try {
            if (count > 0) {
                await navigator.setAppBadge(count);
                currentBadgeCount = count;
            } else {
                await navigator.clearAppBadge();
                currentBadgeCount = 0;
            }
        } catch (error) {
            console.log('Badge API not supported or failed:', error);
        }
    }
}

// Install event: cache the essential files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache and caching essential assets');
            return cache.addAll(URLS_TO_CACHE);
        })
    );
});

// Fetch event: serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Listen for push events (for server-sent notifications)
self.addEventListener('push', function(event) {
    let data = {};
    if (event.data) {
        data = event.data.json();
    }
    const title = data.title || "New Notification";
    const options = {
        body: data.body || "You have a new notification.",
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-192.png',
        data: data, // Pass all data for use in click handler
        actions: [
            {action: 'close', title: 'Close'},
            {action: 'mute', title: 'Mute'}
        ]
    };
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Listen for notification click events
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    if (event.action === 'mute') {
        // You can implement mute logic here (e.g., set a flag in IndexedDB)
        // For now, just close the notification
        return;
    }
    // Focus or open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Listen for messages from the main app to show notifications (for local reminders)
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body } = event.data;
        self.registration.showNotification(title, {
            body: body,
            icon: '/assets/icons/icon-192.png',
            badge: '/assets/icons/icon-192.png',
            actions: [
                {action: 'close', title: 'Close'},
                {action: 'mute', title: 'Mute'}
            ]
        });
    }
    
    // Handle badge updates
    if (event.data && event.data.type === 'UPDATE_BADGE') {
        const { count } = event.data;
        updateBadge(count);
    }
    
    // Handle badge increment (for new updates)
    if (event.data && event.data.type === 'INCREMENT_BADGE') {
        currentBadgeCount++;
        updateBadge(currentBadgeCount);
    }
    
    // Handle badge clear
    if (event.data && event.data.type === 'CLEAR_BADGE') {
        updateBadge(0);
    }
});