// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // Get the necessary elements from the page
    const startBtn = document.getElementById('start-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const welcomeContent = document.getElementById('welcome-content');

    // Check if all elements exist before adding the event listener
    if (startBtn && loadingOverlay && welcomeContent) {

        // Add a click event listener to the start button
        // **CHANGED** We make this an 'async' function to use 'await'
        startBtn.addEventListener('click', async () => { 
            
            // Hide the welcome content
            welcomeContent.style.opacity = '0';

            // Show the loading overlay
            loadingOverlay.classList.add('show');

            // --- **NEW** SMART REDIRECT LOGIC ---
            
            // 1. Check if the user is logged in
            // We 'await' the result from Supabase.
            const { data: { session } } = await supabase.auth.getSession();

            // 2. Wait for a short period to make the animation feel smooth
            // This replaces your old 3-second timer.
            setTimeout(() => {
                // 3. Decide where to send the user
                if (session) {
                    // If there IS a session (user is logged in), go to the dashboard.
                    window.location.href = 'dashboard.html';
                } else {
                    // If there is NO session (user is not logged in), go to the auth page.
                    window.location.href = 'auth.html';
                }
            }, 1500); // We can make this shorter (1.5 seconds) as checking is fast.

        });
    } else {
        console.error('One or more elements for the welcome page script are missing!');
    }
});