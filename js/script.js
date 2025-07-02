// =====================================================================
// SCRIPT.JS - FINAL SUPABASE VERSION
// This version is designed to be stable and reliable.
// =====================================================================
// Add this to the top of your main JS file (e.g., js/script.js)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
document.addEventListener("DOMContentLoaded", async () => {

    // --- SELECTORS & STATE ---
    const taskList = document.querySelector('.task-list');
    const addTaskButton = document.querySelector('.fab');
    const modal = document.querySelector('#add-task-modal');
    const cancelButton = document.querySelector('#cancel-btn');
    const addButton = document.querySelector('#add-btn');
    const taskInput = document.querySelector('#task-input');
    const welcomeGreeting = document.getElementById('welcome-greeting');

    let tasks = []; // Start with an empty array. It will be filled from the database.
    let timerInterval = null;
    const completionSound = new Audio('assets/audio 3.mp3');

    // --- SUPABASE FUNCTIONS (The New Data Engine) ---

        // 1. Function to load all tasks from the database and greet the user
    async function loadTasks() {
        // First, get the current user. This is essential for everything that follows.
        const { data: { user } } = await supabase.auth.getUser();

        // If no user is logged in, stop the function immediately.
        if (!user) {
            console.log("No user logged in. Can't load tasks.");
            return;
        }

        // --- NEW GREETING LOGIC ---
        // Get the h1 element for the greeting.
        const welcomeGreeting = document.getElementById('welcome-greeting');
        if (welcomeGreeting) { // Check if the element exists
            // Try to get the full name from Google metadata first.
            let displayName = user.user_metadata?.full_name;

            // If there's no full name (e.g., email/password signup), use the email.
            if (!displayName) {
                displayName = user.email.split('@')[0]; // Gets the part before the @
            }
            
            // Capitalize the first letter for a nice look.
            const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

            // Update the h1 tag's text content.
            welcomeGreeting.textContent = `Hi, ${formattedName}! 👋`;
        }
        // --- END OF GREETING LOGIC ---

        // Now, fetch only the tasks that belong to this user.
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id) // The filter for user-specific data
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error loading tasks:", error);
            return; // Stop if there's a database error
        }

        // Map the database data to include the temporary UI state properties
        tasks = data.map(dbTask => ({
            ...dbTask,
            isSettingUp: false,
            isTiming: false,
            remainingTime: 0,
        }));
        
        renderTasks(); // Render the user's tasks to the screen
    }

    // 2. Function to add a single task to the database
    async function addTask(text) {
        if (!text) return;
        // --- ADD THESE 3 LINES ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("You must be logged in to add a task.");
        return; // Stop if no one is logged in
    }
        const { error } = await supabase.from('tasks').insert([{ text: text, user_id: user.id }]);
        
        if (error) {
            console.error("Error adding task:", error);
        } else {
            await loadTasks(); // Reload all tasks to show the new one
        }
    }

    // 3. Function to update a task in the database
    async function updateTask(id, updates) {
        const { error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error("Error updating task:", error);
        } else {
            await loadTasks(); // Reload all tasks to show the change
        }
    }
    
    // 4. Function to delete a task from the database (We should add this!)
    async function deleteTask(id) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);
            
        if (error) {
            console.error("Error deleting task:", error);
        } else {
            await loadTasks(); // Reload to show the task is gone
        }
    }

    // --- YOUR ORIGINAL UI AND TIMER FUNCTIONS ---
   // Add this new function somewhere with your other UI functions
// In js/script.js

function updateWelcomeMessage(user) {
    if (!user) return;

    // **NEW** Select the specific span for the name
    const userNameElement = document.getElementById('user-name');
    if (!userNameElement) return; // Safety check

    let displayName = user.user_metadata?.full_name;

    if (!displayName) {
        displayName = user.email.split('@')[0];
    }

    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    // **CHANGED** We now only update the text of the name span
    userNameElement.textContent = formattedName;
}
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function renderTasks() {
        taskList.innerHTML = '';
        const isAnyTaskTiming = tasks.some(t => t.isTiming || t.isSettingUp);

        tasks.forEach((task, index) => {
            // ... (Your complex render logic here - it doesn't need to change)
            const listItem = document.createElement('li');
            listItem.classList.add('task-item');
            listItem.dataset.index = index;

            if (task.completed) listItem.classList.add('done');
            if (task.isSettingUp) listItem.classList.add('setting-up');
            if (task.isTiming) listItem.classList.add('timing');
            if (isAnyTaskTiming && !task.isTiming && !task.isSettingUp) listItem.style.opacity = '0.4';

            listItem.innerHTML = `
                <div class="task-content">
                    <span class="task-text">${task.text}</span>
                    <div class="task-actions">
                        <div class="task-checkbox" data-action="toggle-complete">
                            ${task.completed ? '<span data-lucide="check" style="color:white;"></span>' : ''}
                        </div>
                        <button class="timer-btn" data-action="setup-timer">
                            <span data-lucide="play-circle"></span>
                        </button>
                         <button class="delete-btn" data-action="delete-task">
                            <span data-lucide="trash-2"></span>
                        </button>
                    </div>
                </div>
                <div class="timer-setup-container">
                    <input type="number" class="time-input" placeholder="25" min="1">
                    <span class="unit">min</span>
                    <div class="setup-actions">
                        <button class="btn" data-action="cancel-setup">Cancel</button>
                        <button class="btn primary" data-action="start-timer">Start</button>
                    </div>
                </div>
                <div class="timer-countdown-container">
                    <div class="timer-display">${formatTime(task.remainingTime)}</div>
                    <div class="timer-controls">
                        <button class="btn secondary" data-action="stop-timer">Stop</button>
                    </div>
                </div>
            `;
            taskList.appendChild(listItem);
        });
        lucide.createIcons();
    }

    function handleTimerTick() {
        const activeTaskIndex = tasks.findIndex(t => t.isTiming);
        if (activeTaskIndex === -1) {
            clearInterval(timerInterval);
            timerInterval = null;
            return;
        }

        const task = tasks[activeTaskIndex];
        task.remainingTime--;

        if (task.remainingTime < 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            completionSound.play();
            updateTask(task.id, { completed: true });
        } else {
            renderTasks(); 
        }
    }

    // --- EVENT LISTENER ---
    taskList.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const listItem = target.closest('.task-item');
        const index = parseInt(listItem.dataset.index, 10);
        const task = tasks[index];

        switch (action) {
            case 'toggle-complete':
                updateTask(task.id, { completed: !task.completed });
                break;
            
            case 'delete-task': // New case for the delete button
                if (confirm(`Are you sure you want to delete "${task.text}"?`)) {
                    deleteTask(task.id);
                }
                break;
            
            // ... (Your other cases: setup-timer, cancel-setup, etc. are fine)
            case 'setup-timer':
                if (timerInterval || tasks.some(t => t.isTiming || t.isSettingUp)) {
                    alert("Another task is already in progress!"); return;
                }
                task.isSettingUp = true; renderTasks(); break;
            case 'cancel-setup':
                task.isSettingUp = false; renderTasks(); break;
            case 'start-timer':
                const minutesInput = listItem.querySelector('.time-input');
                const minutes = parseInt(minutesInput.value || 25, 10);
                if (isNaN(minutes) || minutes <= 0) {
                    alert("Please enter a valid number of minutes."); return;
                }
                task.remainingTime = minutes * 60;
                task.isSettingUp = false;
                task.isTiming = true;
                timerInterval = setInterval(handleTimerTick, 1000);
                renderTasks(); break;
            case 'stop-timer':
                clearInterval(timerInterval);
                timerInterval = null;
                task.isTiming = false; renderTasks(); break;
        }
    });

    // --- MODAL LOGIC ---
    async function handleAddTask() {
        const text = taskInput.value.trim();
        if (text) {
            await addTask(text);
            taskInput.value = '';
            hideModal();
        } else {
            alert("Please enter a task!");
        }
    }

    function showModal() { modal.classList.add('show'); }
    function hideModal() { modal.classList.remove('show'); }

    addTaskButton.addEventListener('click', showModal);
    cancelButton.addEventListener('click', hideModal);
addButton.addEventListener('click', handleAddTask);
    modal.addEventListener('click', (e) => e.target === modal && hideModal());

    // --- INITIAL EXECUTION ---
    await loadTasks();

    // --- BOTTOM NAV FIX ---
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = location.pathname.split("/").pop() || "dashboard.html";
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active");
        }
    });
     lucide.createIcons();
});
 

