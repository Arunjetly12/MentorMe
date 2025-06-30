// =====================================================================
// SCRIPT.JS - FINAL SECURE VERSION WITH USER-SPECIFIC DATA
// =====================================================================

document.addEventListener("DOMContentLoaded", async () => {

    // --- SELECTORS & STATE ---
    const taskList = document.querySelector('.task-list');
    const addTaskButton = document.querySelector('.fab');
    const modal = document.querySelector('#add-task-modal');
    const cancelButton = document.querySelector('#cancel-btn');
    const addButton = document.querySelector('#add-btn');
    const taskInput = document.querySelector('#task-input');

    let tasks = [];
    let timerInterval = null;
    const completionSound = new Audio('assets/audio 3.mp3');

    // --- SUPABASE FUNCTIONS (Now User-Aware) ---

    // 1. Function to load tasks for ONLY the logged-in user
    async function loadTasks() {
        // **CHANGED** Get the current user first. This is essential.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log("No user logged in. Can't load tasks.");
            return; // Stop the function if no one is logged in.
        }

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            // **CHANGED** This is the magic filter. It only gets tasks where the
            // user_id column matches the ID of the person currently logged in.
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error loading tasks:", error);
            return;
        }

        tasks = data.map(dbTask => ({
            ...dbTask,
            isSettingUp: false,
            isTiming: false,
            remainingTime: 0,
        }));
        
        renderTasks();
    }

    // 2. Function to add a task for the logged-in user
    async function addTask(text) {
        if (!text) return;
        
        // **CHANGED** Get the current user to tag the new task with their ID.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("You must be logged in to add a task.");
            return;
        }
        
        // **CHANGED** When inserting the new task, we also include the user.id.
        const { error } = await supabase.from('tasks').insert([
            { text: text, user_id: user.id }
        ]);
        
        if (error) {
            console.error("Error adding task:", error);
        } else {
            await loadTasks();
        }
    }

    // 3. Function to update a task (no changes needed, it works by the task's unique 'id')
    async function updateTask(id, updates) {
        const { error } = await supabase.from('tasks').update(updates).eq('id', id);
        if (error) {
            console.error("Error updating task:", error);
        } else {
            await loadTasks();
        }
    }
    
    // 4. Function to delete a task (no changes needed, it works by the task's unique 'id')
    async function deleteTask(id) {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) {
            console.error("Error deleting task:", error);
        } else {
            await loadTasks();
        }
    }

    // --- YOUR ORIGINAL UI AND TIMER FUNCTIONS (No Changes Here) ---
    // All your beautiful UI and timer logic remains exactly the same.
    function formatTime(seconds) { /* ... */ }
    function renderTasks() { /* ... */ }
    function handleTimerTick() { /* ... */ }

    // --- EVENT LISTENER (No Changes Here) ---
    // Your event listener logic is perfect and doesn't need to change.
    taskList.addEventListener('click', (event) => { /* ... */ });

    // --- MODAL LOGIC (No Changes Here) ---
    async function handleAddTask() { /* ... */ }
    function showModal() { /* ... */ }
    function hideModal() { /* ... */ }
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

    // Re-pasting your unchanged functions here for a complete file
    function formatTime(seconds) { const minutes = Math.floor(seconds / 60); const secs = seconds % 60; return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; }
    function renderTasks() { taskList.innerHTML = ''; const isAnyTaskTiming = tasks.some(t => t.isTiming || t.isSettingUp); tasks.forEach((task, index) => { const listItem = document.createElement('li'); listItem.classList.add('task-item'); listItem.dataset.index = index; if (task.completed) listItem.classList.add('done'); if (task.isSettingUp) listItem.classList.add('setting-up'); if (task.isTiming) listItem.classList.add('timing'); if (isAnyTaskTiming && !task.isTiming && !task.isSettingUp) listItem.style.opacity = '0.4'; listItem.innerHTML = ` <div class="task-content"> <span class="task-text">${task.text}</span> <div class="task-actions"> <div class="task-checkbox" data-action="toggle-complete"> ${task.completed ? '<span data-lucide="check" style="color:white;"></span>' : ''} </div> <button class="timer-btn" data-action="setup-timer"> <span data-lucide="play-circle"></span> </button> <button class="delete-btn" data-action="delete-task"> <span data-lucide="trash-2"></span> </button> </div> </div> <div class="timer-setup-container"> <input type="number" class="time-input" placeholder="25" min="1"> <span class="unit">min</span> <div class="setup-actions"> <button class="btn" data-action="cancel-setup">Cancel</button> <button class="btn primary" data-action="start-timer">Start</button> </div> </div> <div class="timer-countdown-container"> <div class="timer-display">${formatTime(task.remainingTime)}</div> <div class="timer-controls"> <button class="btn secondary" data-action="stop-timer">Stop</button> </div> </div> `; taskList.appendChild(listItem); }); lucide.createIcons(); }
    function handleTimerTick() { const activeTaskIndex = tasks.findIndex(t => t.isTiming); if (activeTaskIndex === -1) { clearInterval(timerInterval); timerInterval = null; return; } const task = tasks[activeTaskIndex]; task.remainingTime--; if (task.remainingTime < 0) { clearInterval(timerInterval); timerInterval = null; completionSound.play(); updateTask(task.id, { completed: true }); } else { renderTasks(); } }
    taskList.addEventListener('click', (event) => { const target = event.target.closest('[data-action]'); if (!target) return; const action = target.dataset.action; const listItem = target.closest('.task-item'); const index = parseInt(listItem.dataset.index, 10); const task = tasks[index]; if(!task) return; switch (action) { case 'toggle-complete': updateTask(task.id, { completed: !task.completed }); break; case 'delete-task': if (confirm(`Are you sure you want to delete "${task.text}"?`)) { deleteTask(task.id); } break; case 'setup-timer': if (timerInterval || tasks.some(t => t.isTiming || t.isSettingUp)) { alert("Another task is already in progress!"); return; } task.isSettingUp = true; renderTasks(); break; case 'cancel-setup': task.isSettingUp = false; renderTasks(); break; case 'start-timer': const minutesInput = listItem.querySelector('.time-input'); const minutes = parseInt(minutesInput.value || 25, 10); if (isNaN(minutes) || minutes <= 0) { alert("Please enter a valid number of minutes."); return; } task.remainingTime = minutes * 60; task.isSettingUp = false; task.isTiming = true; timerInterval = setInterval(handleTimerTick, 1000); renderTasks(); break; case 'stop-timer': clearInterval(timerInterval); timerInterval = null; task.isTiming = false; renderTasks(); break; } });
    async function handleAddTask() { const text = taskInput.value.trim(); if (text) { await addTask(text); taskInput.value = ''; hideModal(); } else { alert("Please enter a task!"); } }
});