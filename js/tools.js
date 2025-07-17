// --- JS/TOOLS.JS (With Supabase for Preferences) ---

document.addEventListener('DOMContentLoaded', async () => {

    // ===================================
    //      SHARED FUNCTIONS & STATE
    // ===================================
    function speak(text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }

    // ===================================
    //      POMODORO TIMER SECTION (No Changes)
    // ===================================
    const WORK_TIME = 25 * 60;
    const BREAK_TIME = 5 * 60;
    let pomoTimerId = null;
    let pomoTimeRemaining = WORK_TIME;
    let pomoIsRunning = false;
    let pomoCurrentMode = 'work';
    const pomoTimeDisplay = document.querySelector('#pomodoro-time');
    const pomoTitleDisplay = document.querySelector('#pomodoro-title');
    const pomoStartBtn = document.querySelector('#start-btn');
    const pomoPauseBtn = document.querySelector('#pause-btn');
    const pomoResetBtn = document.querySelector('#reset-btn');
    const pomodoroSound = new Audio('assets/alarm 2.mp3');

    // All your Pomodoro functions (updatePomoDisplay, switchPomoMode, etc.) remain exactly the same.
    // They don't need Supabase, so we leave them as they are.
    function updatePomoDisplay() { const minutes = Math.floor(pomoTimeRemaining / 60); const seconds = pomoTimeRemaining % 60; pomoTimeDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; }
    function switchPomoMode() { if (pomoCurrentMode === 'work') { pomoCurrentMode = 'break'; pomoTimeRemaining = BREAK_TIME; pomoTitleDisplay.textContent = 'Pomodoro: Break Time!'; } else { pomoCurrentMode = 'work'; pomoTimeRemaining = WORK_TIME; pomoTitleDisplay.textContent = 'Pomodoro: Focus Time'; } updatePomoDisplay(); }
    function startPomoTimer() { if (pomoIsRunning) return; pomoIsRunning = true; pomoTimerId = setInterval(() => { pomoTimeRemaining--; updatePomoDisplay(); if (pomoTimeRemaining <= 0) { clearInterval(pomoTimerId); pomoIsRunning = false; pomodoroSound.play(); if (pomoCurrentMode === 'work') { speak("Great focus session! Time for a short break."); } else { speak("Break is over. Time to get back to work!"); } switchPomoMode(); } }, 1000); }
    function pausePomoTimer() { clearInterval(pomoTimerId); window.speechSynthesis.cancel(); pomoIsRunning = false; }
    function resetPomoTimer() { clearInterval(pomoTimerId); pomoIsRunning = false; pomodoroSound.pause(); pomodoroSound.currentTime = 0; window.speechSynthesis.cancel(); pomoTimeRemaining = (pomoCurrentMode === 'work') ? WORK_TIME : BREAK_TIME; updatePomoDisplay(); }
    
    pomoStartBtn.addEventListener('click', startPomoTimer);
    pomoPauseBtn.addEventListener('click', pausePomoTimer);
    pomoResetBtn.addEventListener('click', resetPomoTimer);
    updatePomoDisplay();

    // ===================================
    //      SCHEDULED VOICE REMINDER (No Changes)
    // ===================================
    const voiceTextInput = document.querySelector('#scheduled-voice-text');
    const voiceTimeSelect = document.querySelector('#scheduled-voice-time');
    const setVoiceReminderBtn = document.querySelector('#set-voice-reminder-btn');
    setVoiceReminderBtn.addEventListener('click', () => { const textToSpeak = voiceTextInput.value.trim(); const minutesToWait = parseInt(voiceTimeSelect.value, 10); if (!textToSpeak) { speak("Please type a reminder message first."); return; } const timeToWaitMs = minutesToWait * 60 * 1000; setTimeout(() => { speak(textToSpeak); }, timeToWaitMs); alert(`Okay, I will remind you to "${textToSpeak}" in ${minutesToWait} minutes.`); voiceTextInput.value = ''; });

    // ===================================
    //      FOCUS TOOLS SECTION (Stopwatch & Countdown - No Changes)
    // ===================================
    // --- STOPWATCH ---
    let swTimerId = null, swTimeElapsed = 0, swIsRunning = false;
    const swDisplay = document.querySelector('#stopwatch-display');
    const swStartBtn = document.querySelector('#sw-start');
    const swStopBtn = document.querySelector('#sw-stop');
    const swResetBtn = document.querySelector('#sw-reset');
    function updateStopwatchDisplay() { let ms = swTimeElapsed % 1000; let s = Math.floor(swTimeElapsed / 1000) % 60; let m = Math.floor(swTimeElapsed / (1000 * 60)) % 60; swDisplay.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}:${ms < 100 ? (ms < 10 ? '00' : '0') : ''}${Math.floor(ms/10)}`; }
    swStartBtn.addEventListener('click', () => { if (swIsRunning) return; swIsRunning = true; let startTime = Date.now() - swTimeElapsed; swTimerId = setInterval(() => { swTimeElapsed = Date.now() - startTime; updateStopwatchDisplay(); }, 10); });
    swStopBtn.addEventListener('click', () => { clearInterval(swTimerId); swIsRunning = false; });
    swResetBtn.addEventListener('click', () => { clearInterval(swTimerId); swIsRunning = false; swTimeElapsed = 0; updateStopwatchDisplay(); });
    
    // --- COUNTDOWN ---
    let cdTimerId = null, cdTimeRemaining = 0, cdIsRunning = false;
    const cdDisplay = document.querySelector('#countdown-display');
    const cdInput = document.querySelector('#countdown-input');
    const cdStartBtn = document.querySelector('#cd-start');
    const cdStopBtn = document.querySelector('#cd-stop');
    const cdResetBtn = document.querySelector('#cd-reset');
    function updateCountdownDisplay() { let m = Math.floor(cdTimeRemaining / 60); let s = cdTimeRemaining % 60; cdDisplay.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`; }
    function startCountdown() { if (cdIsRunning) return; const minutes = parseInt(cdInput.value); if (isNaN(minutes) || minutes <= 0) { alert("Please enter a valid number of minutes."); return; } if (cdTimeRemaining === 0) cdTimeRemaining = minutes * 60; cdIsRunning = true; cdTimerId = setInterval(() => { cdTimeRemaining--; updateCountdownDisplay(); if (cdTimeRemaining <= 0) { clearInterval(cdTimerId); cdIsRunning = false; speak("Countdown finished!"); } }, 1000); }
    cdStartBtn.addEventListener('click', startCountdown);
    cdStopBtn.addEventListener('click', () => { clearInterval(cdTimerId); cdIsRunning = false; });
    cdResetBtn.addEventListener('click', () => { clearInterval(cdTimerId); cdIsRunning = false; cdTimeRemaining = 0; cdInput.value = ''; updateCountdownDisplay(); });

    // ===================================
    //      FOCUS REMINDER (CHANGED TO USE SUPABASE)
    // ===================================
    let focusTimerId = null;
    let focusIsActive = false; // This will be set from Supabase
    const focusToggleBtn = document.querySelector('#focus-toggle');

    // **NEW** Function to update the UI based on the setting
    function setFocusUI(isActive) {
        if (isActive) {
            focusToggleBtn.textContent = 'Turn Off';
            focusToggleBtn.classList.add('active');
        } else {
            focusToggleBtn.textContent = 'Turn On';
            focusToggleBtn.classList.remove('active');
        }
    }

    // **NEW** Function to start or stop the actual reminder interval
    function handleFocusInterval(isActive) {
        clearInterval(focusTimerId); // Always clear the old one first
        if (isActive) {
            speak("Focus reminder activated.");
            focusTimerId = setInterval(() => {
                speak("Stay focused. You are doing great.");
            }, 600000); // Every 10 minutes
        }
    }

    // **NEW** Event listener now saves the setting to Supabase
    focusToggleBtn.addEventListener('click', async () => {
        focusIsActive = !focusIsActive; // Flip the state
        setFocusUI(focusIsActive); // Update the button immediately
        handleFocusInterval(focusIsActive); // Start/stop the voice
        
        // Save the new setting to our single row in the database
        const { error } = await supabase
            .from('user_preferences')
            .update({ focus_reminder_enabled: focusIsActive })
            .eq('id', 1); // We update the row with id = 1

        if (error) {
            console.error("Failed to save focus preference:", error);
        }
    });

    // **NEW** Function to load the preference when the page starts
    async function loadFocusPreference() {
        // Get the single row from our preferences table
        const { data, error } = await supabase
            .from('user_preferences')
            .select('focus_reminder_enabled')
            .eq('id', 1)
            .single(); // .single() gets just one object, not an array

        if (error || !data) {
            console.error("Could not load user preferences:", error);
            focusIsActive = false; // Default to off if there's an error
        } else {
            focusIsActive = data.focus_reminder_enabled;
        }

        // Set the UI and start the interval if it was enabled
        setFocusUI(focusIsActive);
        handleFocusInterval(focusIsActive);
    }
    
    // --- INITIAL EXECUTION ---
    // **NEW** Load the saved setting from Supabase
    await loadFocusPreference();
    
    // ===================================
    //      NAV LINK HIGHLIGHT FIX
    // ===================================
    // Netlify-compatible navigation active state
    function setActiveNavLink() {
      const navLinks = document.querySelectorAll('.nav-link');
      
      // First, remove all active classes
      navLinks.forEach(link => link.classList.remove("active"));
      
      // Get current page name - handle Netlify's clean URLs
      const currentPath = window.location.pathname;
      const currentPage = currentPath.split("/").pop() || "tools";
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

    lucide.createIcons();
});