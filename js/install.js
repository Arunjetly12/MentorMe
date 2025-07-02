// js/install.js - This code is correct and ready to go.

let deferredPrompt;
const installButton = document.getElementById('install-button');

// This event fires when the browser has checked your manifest and service worker and says "✅ It's installable!"
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default browser install banner
  e.preventDefault();
  
  // Store the event so we can use it later
  deferredPrompt = e;
  
  // Show your custom, awesome-looking button
  console.log('PWA is installable, showing the custom install button.');
  if (installButton) {
    installButton.style.display = 'flex'; // Use 'flex' to match your CSS
  }
});

// Add the click listener to your button
if (installButton) {
  installButton.addEventListener('click', async () => {
    // Hide the button, since the user is interacting with the prompt
    installButton.style.display = 'none';
    
    // Trigger the browser's own installation prompt
    deferredPrompt.prompt();
    
    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We can't use the prompt again, so clear it
    deferredPrompt = null;
  });
}

// Optional: Log when the app is successfully installed
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed successfully!');
  deferredPrompt = null;
});