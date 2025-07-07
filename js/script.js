// =====================================================================
// FINAL SUPABASE VERSION with Timetable Integration - FIXED
// =====================================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered:', reg))
        .catch(err => console.error('Service Worker failed:', err));
    });
  }
  
  // ==== PUSH NOTIFICATION SUBSCRIPTION (SUPABASE) ====

  const VAPID_PUBLIC_KEY = 'BPoRHtBVfefKVFTLW7cs8NFezpRkHw__mw_Tr0ci6MGzcGl7QZRC1QtIxrPeEGpqMHH5pcrhF6tKUqAHyFG-aMs';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function subscribeUserToPush(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Save subscription to Supabase
    await supabase.from('push_subscriptions').upsert([
      {
        user_id: userId,
        subscription: subscription.toJSON()
      }
    ]);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // --- SELECTORS ---
    const taskList = document.querySelector('.task-list');
    const addTaskButton = document.querySelector('.fab');
    const modal = document.querySelector('#add-task-modal');
    const cancelButton = document.querySelector('#cancel-btn');
    const addButton = document.querySelector('#add-btn');
    const taskInput = document.querySelector('#task-input');
    const welcomeGreeting = document.getElementById('welcome-greeting');
    const timetableCardTitle = document.querySelector('.timetable-card h2');
    const templateContainer = document.getElementById('template-list-container');
    const navLinks = document.querySelectorAll('.nav-link');
  
    let tasks = [];
    let timerInterval = null;
    const completionSound = new Audio('assets/audio 3.mp3');
  
    // ===============================================
    // FINAL DASHBOARD TIMETABLE LOADER (with Edit)
    // ===============================================
  
    // Helper function to get today's date in YYYY-MM-DD format
    function getTodaysDateString() {
      return new Date().toISOString().split('T')[0];
    }
  
    // The new, final function to load and display tasks for today
    async function loadTodaysTimetable() {
      // IT LOOKS FOR 'timetable-body', our NEW container's ID!
      const timetableBody = document.getElementById('timetable-body'); 
      const timetableCardTitle = document.getElementById('timetable-card-title');
      const editBtn = document.getElementById('edit-timetable-btn');
      // It will NOT touch the old '.task-list' container.
      if (!timetableBody) return; 
      
      const todayDateStr = new Date().toISOString().split('T')[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', todayDateStr)
          .order('id', { ascending: true });
      
      if (error) {
          console.error("Error fetching tasks:", error);
          timetableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7);">Could not load tasks.</td></tr>`;
          return;
      }
      
      timetableBody.innerHTML = '';
      
      if (tasks.length === 0) {
          timetableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7);">Nothing scheduled for today!</td></tr>`;
          editBtn.style.display = 'none';
      } else {
          editBtn.style.display = 'flex';
          editBtn.href = `timetable-editor.html?date=${todayDateStr}`;
          
          let cumulativeTime = 0;
          const startTime = new Date();
          startTime.setHours(9, 0, 0, 0); // Start at 9 AM
          
          tasks.forEach(task => {
              const taskStartTime = new Date(startTime.getTime() + cumulativeTime * 1000);
              const timeString = taskStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td style="font-weight: 600; color: #FFCC00;">${task.text}</td>
                  <td style="color: white;">${timeString}</td>
                  <td style="color: white;">${task.duration_minutes} min</td>
              `;
              timetableBody.appendChild(row);
              
              cumulativeTime += task.duration_minutes * 60; // Add duration in seconds
          });
      }
    }
  
    // --- TASK FUNCTIONS (QUICK TASKS ONLY) ---
    async function loadTasks() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      let name = user.user_metadata?.full_name || user.email.split('@')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
      if (welcomeGreeting) welcomeGreeting.textContent = `Hi, ${name}! 👋`;
  
      // Only load tasks that DON'T have a date (quick tasks only)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('date', null)  // Only tasks without a date (quick tasks)
        .order('created_at', { ascending: true });
  
      if (error) return console.error("Error loading tasks:", error);
  
      tasks = data.map(task => ({
        ...task,
        isSettingUp: false,
        isTiming: false,
        remainingTime: 0
      }));
  
      renderTasks();
    }
  
    async function addTask(text) {
      if (!text) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Please log in.");
  
      // Add quick task WITHOUT a date field
      const { error } = await supabase.from('tasks').insert([{ 
        text, 
        user_id: user.id,
        date: null  // Explicitly set to null for quick tasks
      }]);
      if (error) console.error("Error adding task:", error);
      else await loadTasks();
    }
  
    async function updateTask(id, updates) {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) console.error("Update error:", error);
      else await loadTasks();
    }
  
    async function deleteTask(id) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) console.error("Delete error:", error);
      else await loadTasks();
    }
  
    // --- RENDERING & TIMER ---
    function formatTime(seconds) {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
  
    function renderTasks() {
      taskList.innerHTML = '';
      const isTiming = tasks.some(t => t.isTiming || t.isSettingUp);
  
      tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item${task.completed ? ' done' : ''}${task.isSettingUp ? ' setting-up' : ''}${task.isTiming ? ' timing' : ''}`;
        if (isTiming && !task.isTiming && !task.isSettingUp) li.style.opacity = '0.4';
        li.dataset.index = index;
  
        li.innerHTML = `
          <div class="task-content">
            <span class="task-text">${task.text}</span>
            <div class="task-actions">
              <div class="task-checkbox" data-action="toggle-complete">
                ${task.completed ? '<span data-lucide="check" style="color:white;"></span>' : ''}
              </div>
              <button class="timer-btn" data-action="setup-timer"><span data-lucide="play-circle"></span></button>
              <button class="delete-btn" data-action="delete-task"><span data-lucide="trash-2"></span></button>
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
          </div>`;
        taskList.appendChild(li);
      });
  
      lucide.createIcons();
    }
  
    function handleTimerTick() {
      const activeIndex = tasks.findIndex(t => t.isTiming);
      if (activeIndex === -1) return clearInterval(timerInterval);
  
      const task = tasks[activeIndex];
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
  
    // --- EVENT HANDLERS ---
    taskList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
  
      const action = btn.dataset.action;
      const listItem = btn.closest('.task-item');
      const index = parseInt(listItem.dataset.index, 10);
      const task = tasks[index];
  
      switch (action) {
        case 'toggle-complete':
          updateTask(task.id, { completed: !task.completed });
          break;
        case 'delete-task':
          if (confirm(`Delete "${task.text}"?`)) deleteTask(task.id);
          break;
        case 'setup-timer':
          if (timerInterval || tasks.some(t => t.isTiming || t.isSettingUp)) return alert("Another task is active.");
          task.isSettingUp = true;
          renderTasks();
          break;
        case 'cancel-setup':
          task.isSettingUp = false;
          renderTasks();
          break;
        case 'start-timer':
          const input = listItem.querySelector('.time-input');
          const minutes = parseInt(input.value || '25', 10);
          if (isNaN(minutes) || minutes <= 0) return alert("Enter valid minutes.");
          task.remainingTime = minutes * 60;
          task.isSettingUp = false;
          task.isTiming = true;
          timerInterval = setInterval(handleTimerTick, 1000);
          renderTasks();
          break;
        case 'stop-timer':
          clearInterval(timerInterval);
          timerInterval = null;
          task.isTiming = false;
          renderTasks();
          break;
      }
    });
  
    // --- MODAL ---
    function showModal() { modal.classList.add('show'); }
    function hideModal() { modal.classList.remove('show'); }
  
    async function handleAddTask() {
      const text = taskInput.value.trim();
      if (text) {
        await addTask(text);
        taskInput.value = '';
        hideModal();
      } else alert("Please enter a task.");
    }
  
    addTaskButton.addEventListener('click', showModal);
    cancelButton.addEventListener('click', hideModal);
    addButton.addEventListener('click', handleAddTask);
    modal.addEventListener('click', (e) => e.target === modal && hideModal());
  
    // --- NAV BAR ACTIVE LINK ---
    const currentPage = location.pathname.split("/").pop() || "dashboard.html";
    navLinks.forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === currentPage);
    });
  
    // --- STUDY TEMPLATE LOADER ---
    if (templateContainer) await loadStudyTemplates();
    
    async function loadStudyTemplates() {
      const { data: templates, error } = await supabase.from('templates').select('*');
  
      if (error) {
        console.error('Template load error:', error.message);
        return templateContainer.innerHTML = '<p class="error-text">Could not load templates.</p>';
      }
  
      if (!templates.length) {
        return templateContainer.innerHTML = '<p>No study templates found.</p>';
      }
  
      templateContainer.innerHTML = '';
      templates.forEach(t => {
        const el = document.createElement('a');
        el.classList.add('template-option');
        el.href = `template-editor.html?id=${t.id}`;
        el.innerHTML = `
          <div class="template-icon"><i data-lucide="${t.icon_name || 'book-open'}"></i></div>
          <div class="template-details">
            <h3>${t.name}</h3>
            <p>${t.description}</p>
          </div>
          <div class="template-arrow"><i data-lucide="chevron-right"></i></div>`;
        templateContainer.appendChild(el);
      });
  
      lucide.createIcons();
    }
  
    // --- FINAL INIT ---
    await loadTasks();
    if (document.getElementById('timetable-body')) await loadTodaysTimetable(); // load only if timetable section exists

    // After confirming user is logged in:
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        await subscribeUserToPush(user.id);
      }
    }
  });