// --- JS/ACCOUNT.JS ---

document.addEventListener('DOMContentLoaded', () => {
    
    const userEmailDisplay = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const profileAvatar = document.getElementById('profile-avatar');

    // Get the current user
    async function loadUserProfile() {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Display user's email
            userEmailDisplay.textContent = user.email;

            // Display user's avatar from Google, or the default one
            if (user.user_metadata.avatar_url) {
                profileAvatar.src = user.user_metadata.avatar_url;
            }
        }
    }

    // Function to handle logout
    async function handleLogout() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            alert(`Logout Error: ${error.message}`);
        } else {
            // Redirect to the login page after successful logout
            window.location.href = 'auth.html';
        }
    }

    // Add event listener to the logout button
    logoutBtn.addEventListener('click', handleLogout);

    // Load the profile when the page opens
    loadUserProfile();
});