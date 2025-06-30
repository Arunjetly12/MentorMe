// --- JS/REMINDERS.JS (Supabase Version) ---

document.addEventListener('DOMContentLoaded', async () => {

    // --- SELECTORS ---
    const reminderTextInput = document.querySelector('#reminder-text');
    const reminderTimeInput = document.querySelector('#reminder-time');
    const setReminderBtn = document.querySelector('#set-reminder-btn');
    const remindersList = document.querySelector('#reminders-list');
    const reminderAlertModal = document.querySelector('#reminder-alert-modal');
    const alertText = document.querySelector('#alert-text');
    const alertOkBtn = document.querySelector('#alert-ok-btn');

    const alarmSound = new Audio('assets/alarm.mp3');

    // --- DATA ---
    // **CHANGED** This will be filled from the database now.
    let reminders = [];

    // --- **NEW** SUPABASE FUNCTIONS ---

    // 1. Function to load all reminders from the database
    async function loadReminders() {
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .order('time', { ascending: true }); // Show earliest reminders first

        if (error) {
            console.error("Error loading reminders:", error);
        } else {
            reminders = data;
            renderReminders();
            // **IMPORTANT**: After loading, schedule alerts for all of them.
            scheduleAllReminders(); 
        }
    }

    // 2. Function to add a single reminder to the database
    async function addReminder(text, time) {
        if (!text || !time) return;
        
        const { error } = await supabase.from('reminders').insert([{ text, time }]);
        
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
            remindersList.innerHTML = '<li>No reminders set.</li>';
            return;
        }
        reminders.forEach(reminder => {
            const listItem = document.createElement('li');
            listItem.classList.add('task-item');
            // We need to format the time, Supabase gives '14:30:00', let's show '14:30'
            const [hours, minutes] = reminder.time.split(':');
            const formattedTime = `${hours}:${minutes}`;
            listItem.textContent = `"${reminder.text}" at ${formattedTime}`;
            remindersList.appendChild(listItem);
        });
    }

    // This function will schedule a pop-up for a single reminder
    function scheduleAlert(text, time) {
        const now = new Date();
        const [hours, minutes] = time.split(':');
        
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0);

        // If the time has already passed for today, don't schedule it.
        // A more advanced version could schedule for tomorrow, but this is safer.
        if (reminderTime < now) {
            console.log(`Skipping past reminder for ${time}`);
            return;
        }

        const timeToWait = reminderTime.getTime() - now.getTime();
        
        console.log(`Scheduling alert for "${text}" in ${timeToWait / 1000} seconds.`);

        setTimeout(() => {
            console.log(`Firing reminder: "${text}"`);
            alertText.textContent = text;
            reminderAlertModal.classList.add('show');
            alarmSound.play();
        }, timeToWait);
    }
    
    // **NEW** This function loops through all loaded reminders and schedules them.
    function scheduleAllReminders() {
        console.log("Scheduling alerts for all loaded reminders...");
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
        
        // **CHANGED** We now call our Supabase function
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
    // **CHANGED** Load everything from the database when the page starts.
    await loadReminders();


    // --- ACTIVE NAV LINK FIX ---
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = location.pathname.split("/").pop() || "reminders.html"; // Default to this page

    navLinks.forEach(link => {
        const linkPage = link.getAttribute("href");
        if (linkPage === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    lucide.createIcons();
});