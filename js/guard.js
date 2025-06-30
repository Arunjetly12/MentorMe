// --- JS/GUARD.JS (Improved Version) ---

// This function runs immediately
(async () => {
    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession();

    // If there is NO session (user is not logged in)
    if (!session) {
        // Redirect them to the authentication page without an alert
        window.location.href = 'auth.html';
    }
    // If there IS a session, the script does nothing, and the page loads normally.
})();