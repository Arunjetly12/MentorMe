// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================
    // **NEW** PWA Service Worker Registration
    // This should be the first thing to run to make the app installable.
    // ==========================================================
    if ('serviceWorker' in navigator) {
        // We use 'load' event to make sure the page is fully loaded before registering
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    // This message will appear in your browser's dev console
                    console.log('PWA Service Worker registered successfully.');
                })
                .catch(error => {
                    console.error('Service Worker registration failed: ', error);
                });
        });
    }

    // ==========================================================
    // Your existing code starts here (no changes needed below)
    // ==========================================================

    // Get the necessary elements from the page
    const startBtn = document.getElementById('start-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const welcomeContent = document.getElementById('welcome-content');

    // Check if all elements exist before adding the event listener
    if (startBtn && loadingOverlay && welcomeContent) {

        // Add a click event listener to the start button
        startBtn.addEventListener('click', async () => { 
            
            // Hide the welcome content
            welcomeContent.style.opacity = '0';

            // Show the loading overlay
            loadingOverlay.classList.add('show');

            // --- SMART REDIRECT LOGIC ---
            
            // 1. Check if the user is logged in
            const { data: { session } } = await supabase.auth.getSession();

            // 2. Wait for a short period for the animation
            setTimeout(() => {
                // 3. Decide where to send the user
                if (session) {
                    // If user is logged in, go to the dashboard.
                    window.location.href = 'dashboard.html';
                } else {
                    // If user is not logged in, go to the auth page.
                    window.location.href = 'auth.html';
                }
            }, 1500);

        });
    } else {
        console.error('One or more elements for the welcome page script are missing!');
    }
});