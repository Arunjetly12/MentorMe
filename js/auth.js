// --- JS/AUTH.JS (Final Version with Google Sign-In) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    let isLoginMode = true;

    // --- SELECTORS ---
    const form = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const googleBtn = document.getElementById('google-signin-btn'); // We will use this now
    
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');

    // --- FUNCTIONS ---

    function updateUI() { /* ... no changes here ... */ 
        if (isLoginMode) {
            formTitle.textContent = 'Login'; formSubtitle.textContent = 'Welcome back! Please enter your details.';
            submitBtn.textContent = 'Login'; toggleText.textContent = "Don't have an account?";
            toggleLink.textContent = 'Sign Up';
        } else {
            formTitle.textContent = 'Sign Up'; formSubtitle.textContent = 'Create an account to get started.';
            submitBtn.textContent = 'Sign Up'; toggleText.textContent = "Already have an account?";
            toggleLink.textContent = 'Login';
        }
    }

    async function handleSignup(email, password) { /* ... no changes here ... */
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { alert(`Signup Error: ${error.message}`); } 
        else { alert('Signup successful! Please check your email for a verification link.'); isLoginMode = true; updateUI(); }
    }

    async function handleLogin(email, password) { /* ... no changes here ... */
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { alert(`Login Error: ${error.message}`); } 
        else { window.location.href = 'dashboard.html'; }
    }

    // **NEW** Function to handle Google Sign-In
    async function handleGoogleLogin() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        
        if (error) {
            alert(`Google Sign-In Error: ${error.message}`);
        }
        // There is no 'else' here because Supabase automatically handles the redirect
        // to Google and back. Our guard script will handle what happens next.
    }

    // --- EVENT LISTENERS ---

    form.addEventListener('submit', (event) => { /* ... no changes here ... */
        event.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (isLoginMode) { handleLogin(email, password); } 
        else { handleSignup(email, password); }
    });

    toggleLink.addEventListener('click', (event) => { /* ... no changes here ... */
        event.preventDefault();
        isLoginMode = !isLoginMode;
        updateUI();
    });

    // **NEW** Add the event listener for the Google button
    googleBtn.addEventListener('click', () => {
        handleGoogleLogin();
    });
});