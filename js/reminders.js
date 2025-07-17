// --- JS/REMINDERS.JS (Supabase Version with Notification Support) ---

// Global function for deleting individual reminders
async function deleteReminder(reminderId) {
    if (!reminderId) {
        console.error("Reminder ID is undefined");
        return;
    }

    if (!confirm("Are you sure you want to delete this reminder?")) {
        return;
    }

    const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

    if (error) {
        console.error("Error deleting reminder:", error);
        alert("Failed to delete reminder.");
    } else {
        // Reload all reminders
        if (window.loadReminders) {
            await window.loadReminders();
        }
    }
}

// Request notification permission on load
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        try {
            await Notification.requestPermission();
        } catch (e) {
            console.error('Notification permission error:', e);
        }
    }
}

// Helper to send notification via service worker
function showReminderNotification(title, body) {
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

document.addEventListener('DOMContentLoaded', async () => {

    // --- SELECTORS ---
    const reminderTextInput = document.querySelector('#reminder-text');
    const reminderTimeInput = document.querySelector('#reminder-time');
    const setReminderBtn = document.querySelector('#set-reminder-btn');
    const remindersList = document.querySelector('#reminders-list');
    const reminderCountEl = document.querySelector('#reminder-count');
    const emptyStateEl = document.querySelector('#empty-state');
    const reminderAlertModal = document.querySelector('#reminder-alert-modal');
    const alertText = document.querySelector('#alert-text');
    const alertOkBtn = document.querySelector('#alert-ok-btn');

    const alarmSound = new Audio('assets/alarm.mp3');

    // --- DATA ---
    let reminders = [];

    // --- SUPABASE FUNCTIONS ---

    // 1. Function to load all reminders from the database
    async function loadReminders() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log("No user logged in. Can't load reminders.");
            return;
        }

        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .order('time', { ascending: true });

        if (error) {
            console.error("Error loading reminders:", error);
        } else {
            reminders = data;
            renderReminders();
            updateReminderCount();
            scheduleAllReminders(); 
        }
    }

    // 2. Function to add a single reminder to the database
    async function addReminder(text, time) {
        if (!text || !time) return;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("You must be logged in to add a reminder.");
            return;
        }
        
        const { error } = await supabase.from('reminders').insert([
            { text, time, user_id: user.id }
        ]);
        
        if (error) {
            console.error("Error adding reminder:", error);
        } else {
            alert(`Reminder set for "${text}" at ${time}`);
            await loadReminders(); // Reload all reminders to show the new one
        }
    }

    // --- FUNCTIONS ---
    function renderReminders() {
        remindersList.innerHTML = '';
        
        if (reminders.length === 0) {
            // Show empty state
            emptyStateEl.style.display = 'block';
            remindersList.style.display = 'none';
            return;
        }

        // Hide empty state and show list
        emptyStateEl.style.display = 'none';
        remindersList.style.display = 'flex';

        reminders.forEach(reminder => {
            const reminderItem = document.createElement('div');
            reminderItem.classList.add('reminder-item');
            
            // Format the time
            const [hours, minutes] = reminder.time.split(':');
            const formattedTime = `${hours}:${minutes}`;
            
            // Use the new id column
            const reminderId = reminder.id;
            
            reminderItem.innerHTML = `
                <div class="reminder-info">
                    <div class="reminder-text">${reminder.text}</div>
                    <div class="reminder-time">${formattedTime}</div>
                </div>
                <button class="delete-btn" onclick="deleteReminder('${reminderId}')">Delete</button>
            `;
            
            remindersList.appendChild(reminderItem);
        });
    }

    function updateReminderCount() {
        const count = reminders.length;
        reminderCountEl.textContent = `${count} reminder${count !== 1 ? 's' : ''}`;
    }

    // This function will schedule a pop-up and notification for a single reminder
    function scheduleAlert(text, time) {
        const now = new Date();
        const [hours, minutes] = time.split(':');
        
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0);

        // If the time has already passed for today, don't schedule it.
        if (reminderTime < now) {
            return;
        }

        const timeToWait = reminderTime.getTime() - now.getTime();

        setTimeout(() => {
            // Show modal
            alertText.textContent = text;
            reminderAlertModal.classList.add('show');
            alarmSound.play();

            // Show browser notification
            showReminderNotification('Reminder', text);
        }, timeToWait);
    }
    
    // This function loops through all loaded reminders and schedules them.
    function scheduleAllReminders() {
        reminders.forEach(reminder => {
            scheduleAlert(reminder.text, reminder.time);
        });
    }

    // --- EVENT LISTENERS ---
    setReminderBtn.addEventListener('click', async () => {
        const text = reminderTextInput.value.trim();
        const time = reminderTimeInput.value;

        if (!text || !time) {
            alert('Please fill in both the text and the time for the reminder.');
            return;
        }
        
        await addReminder(text, time);
        
        // Clear the input fields
        reminderTextInput.value = '';
        reminderTimeInput.value = '';
    });

    alertOkBtn.addEventListener('click', () => {
        reminderAlertModal.classList.remove('show');
        alarmSound.pause();
        alarmSound.currentTime = 0;
    });

    // --- INITIAL EXECUTION ---
    await requestNotificationPermission();
    await loadReminders();

    // Make loadReminders globally accessible
    window.loadReminders = loadReminders;

    // --- ACTIVE NAV LINK FIX ---
    // Netlify-compatible navigation active state
    function setActiveNavLink() {
      const navLinks = document.querySelectorAll('.nav-link');
      
      // First, remove all active classes
      navLinks.forEach(link => link.classList.remove("active"));
      
      // Get current page name - handle Netlify's clean URLs
      const currentPath = window.location.pathname;
      const currentPage = currentPath.split("/").pop() || "reminders";
      const currentPageName = currentPage.replace(/\.html$/, "");
      
      // Find the matching link and make it active
      navLinks.forEach(link => {
        const href = link.getAttribute("href");
        // Remove both .html extension and leading slash for clean URLs
        const linkPageName = href.replace(/\.html$/, "").replace(/^\//, "");
        
        // Check for exact match
        if (linkPageName === currentPageName) {
          link.classList.add("active");
        }
      });
    }
    
    // Set active nav link
    setActiveNavLink();
    
    // --- SMOOTH PAGE TRANSITIONS ---
    function addPageTransitionEffects() {
      // Add transition class to main container
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.classList.add('page-transition');
      }
      
      // Add loading state to cards during data fetch
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        card.classList.add('page-loading');
      });
      
      // Remove loading state after a short delay
      setTimeout(() => {
        cards.forEach(card => {
          card.classList.remove('page-loading');
        });
      }, 300);
    }
    
    // Initialize page transitions
    addPageTransitionEffects();

    lucide.createIcons();
});
