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