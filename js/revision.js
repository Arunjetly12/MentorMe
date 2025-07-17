// --- JS/REVISION.JS (Final, Rock-Solid Supabase Version) ---

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- DOM ELEMENT SELECTION ---
    const addTopicForm = document.getElementById('add-topic-form');
    const topicNameInput = document.getElementById('topic-name');
    const subjectSelect = document.getElementById('subject-select');
    const confidenceLevelSelect = document.getElementById('confidence-level');
    const todaysRevisionList = document.getElementById('todays-revision-list');
    const allTopicsList = document.getElementById('all-topics-list');
    const manualScheduleCheckbox = document.getElementById('manual-schedule-checkbox');
    const manualDateInput = document.getElementById('manual-date-input');
    const appContainer = document.querySelector('.app-container');

    // --- DATA ---
    let topics = [];

        // --- SUPABASE FUNCTIONS (The Data Engine) ---

    // LOAD: Gets all topics for ONLY the logged-in user
    async function loadTopics() {
        // Get the current user. If no user, stop.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log("No user is logged in. Can't load revision topics.");
            topics = []; // Clear local array if no user
            renderTopics(); // Render the empty state to the screen
            return;
        }

        const { data, error } = await supabase
            .from('revision_topics')
            .select('*')
            // This is the magic filter to get only this user's data
            .eq('user_id', user.id) 
            .order('nextRevisionDate', { ascending: true });

        if (error) {
            console.error("Error loading revision topics:", error);
        } else {
            topics = data;
            renderTopics();
        }
    }

    // ADD: Inserts a new topic and "tags" it with the user's ID
    async function addTopic(newTopicObject) {
        // Get the current user to tag the new topic
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("You must be logged in to add a topic.");
            return;
        }

        // Add the user's ID to the object right before saving it
        const topicToInsert = {
            ...newTopicObject,
            user_id: user.id
        };

        const { error } = await supabase.from('revision_topics').insert([topicToInsert]);
        if (error) {
            console.error("Error adding topic:", error);
            alert("Failed to add topic. Check the console for errors.");
        } else {
            // Success! Reload all topics to show the new one.
            await loadTopics();
        }
    }

    // UPDATE: Finds a topic by its ID and updates it (no changes needed)
    // The RLS policy will automatically prevent a user from updating another user's topic.
    async function updateTopic(topicId, updatesObject) {
        if (isNaN(topicId)) {
            console.error("Update failed: Invalid Topic ID.");
            return;
        }
        const { error } = await supabase.from('revision_topics').update(updatesObject).eq('id', topicId);
        if (error) {
            console.error("Error updating topic:", error);
        } else {
            await loadTopics();
        }
    }

    // DELETE: Finds a topic by its ID and removes it (no changes needed)
    // The RLS policy also protects this action.
    async function deleteTopic(topicId) {
        if (isNaN(topicId)) {
            console.error("Delete failed: Invalid Topic ID.");
            return;
        }
        const { error } = await supabase.from('revision_topics').delete().eq('id', topicId);
        if (error) {
            console.error("Error deleting topic:", error);
        } else {
            await loadTopics();
        }
    }

    // --- HELPER & LOGIC FUNCTIONS ---
    const getTodayDateString = () => new Date().toISOString().split('T')[0];

    const calculateNextRevisionDate = (confidence) => {
        const date = new Date();
        let daysToAdd = 0;
        switch (confidence) {
            case 'weak': daysToAdd = 1; break;
            case 'ok': daysToAdd = 3; break;
            case 'strong': daysToAdd = 7; break;
            case 'updated-weak': daysToAdd = 3; break;
            case 'updated-ok': daysToAdd = 7; break;
            case 'updated-strong': daysToAdd = 14; break;
        }
        date.setDate(date.getDate() + daysToAdd);
        return date.toISOString().split('T')[0];
    };

    const renderTopics = () => {
        const today = getTodayDateString();
        todaysRevisionList.innerHTML = '';
        allTopicsList.innerHTML = '';
        let dueTodayCount = 0;
        let upcomingCount = 0;

        topics.forEach(topic => {
            // **CRITICAL FIX**: Make sure topic.id is valid before rendering
            if (!topic || typeof topic.id === 'undefined') return;

            const topicElementHTML = `
                <div class="revision-item confidence-${topic.confidence}" data-id="${topic.id}">
                    <div class="revision-item-info">
                        <h3>${topic.name}</h3>
                        <p>
                            <span class="subject subject-${topic.subject}">${topic.subject}</span> 
                            | Next: ${new Date(topic.nextRevisionDate + 'T00:00:00').toLocaleDateString()}
                        </p>
                    </div>
                    <div class="revision-item-actions">
                        <button class="action-btn complete-btn" title="Complete Revision"><span data-lucide="check-circle-2"></span></button>
                        <button class="action-btn delete-btn" title="Delete Topic"><span data-lucide="trash-2"></span></button>
                    </div>
                </div>`;
                
            if (topic.nextRevisionDate <= today) {
                todaysRevisionList.innerHTML += topicElementHTML;
                dueTodayCount++;
            } else {
                allTopicsList.innerHTML += topicElementHTML;
                upcomingCount++;
            }
        });

        if (dueTodayCount === 0) {
            todaysRevisionList.innerHTML = '<p class="empty-message">Nothing due today. Great job!</p>';
        }
        if (upcomingCount === 0) {
            allTopicsList.innerHTML = '<p class="empty-message">Add a topic to get started!</p>';
        }
        lucide.createIcons();
    };

    // --- EVENT HANDLERS (Now with proper validation) ---

    addTopicForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const topicName = topicNameInput.value.trim();
        if (!topicName) {
            alert("Please enter a topic name.");
            return;
        }

        // **FIXED LOGIC**: If manual checkbox is NOT checked, we set the date for TODAY.
        let nextRevisionDate;
        if (manualScheduleCheckbox.checked) {
            if (!manualDateInput.value) {
                alert("Please select a date for manual scheduling.");
                return;
            }
            nextRevisionDate = manualDateInput.value;
        } else {
            // Default to today if not scheduling manually
            nextRevisionDate = getTodayDateString();
        }

        const newTopic = {
            name: topicName,
            subject: subjectSelect.value,
            confidence: confidenceLevelSelect.value,
            dateAdded: getTodayDateString(),
            nextRevisionDate: nextRevisionDate,
        };

        addTopic(newTopic);
        addTopicForm.reset();
        manualDateInput.classList.add('hidden');
    });

    manualScheduleCheckbox.addEventListener('change', () => {
        manualDateInput.classList.toggle('hidden', !manualScheduleCheckbox.checked);
        if(manualScheduleCheckbox.checked) {
            manualDateInput.value = getTodayDateString();
        }
    });

    appContainer.addEventListener('click', (e) => {
        const completeBtn = e.target.closest('.complete-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        
        // This handles both complete and delete actions safely
        const actionTarget = completeBtn || deleteBtn;
        if (actionTarget) {
            const topicItem = actionTarget.closest('.revision-item');
            if (!topicItem) return; // Safety check

            const topicId = Number(topicItem.dataset.id);
            // **CRITICAL FIX**: Check if the ID is a valid number before doing anything
            if (isNaN(topicId)) {
                console.error("Action failed: Could not find a valid topic ID.", topicItem);
                return;
            }

            if (completeBtn) {
                const newConfidence = prompt("How do you feel about this topic now? (weak, ok, strong)");
                if (newConfidence && ['weak', 'ok', 'strong'].includes(newConfidence.toLowerCase())) {
                    const newNextRevisionDate = calculateNextRevisionDate(`updated-${newConfidence.toLowerCase()}`);
                    updateTopic(topicId, {
                        confidence: newConfidence.toLowerCase(),
                        nextRevisionDate: newNextRevisionDate
                    });
                } else if (newConfidence !== null) {
                    alert("Invalid input. Please enter 'weak', 'ok', or 'strong'.");
                }
            } else if (deleteBtn) {
                if (confirm("Are you sure you want to delete this topic?")) {
                    deleteTopic(topicId);
                }
            }
        }
    });

    // --- INITIAL EXECUTION ---
    await loadTopics();

    // --- PRELOADER FUNCTIONALITY ---
    function hidePreloader() {
      const preloader = document.getElementById('pagePreloader');
      if (preloader) {
        preloader.classList.add('hidden');
        setTimeout(() => {
          preloader.remove();
        }, 500);
      }
    }
    window.addEventListener('load', () => {
      setTimeout(hidePreloader, 300);
    });
    setTimeout(hidePreloader, 2000);

    // --- BOTTOM NAV ---
    // Netlify-compatible navigation active state
    function setActiveNavLink() {
      const navLinks = document.querySelectorAll('.nav-link');
      
      // First, remove all active classes
      navLinks.forEach(link => link.classList.remove("active"));
      
      // Get current page name - handle Netlify's clean URLs
      const currentPath = window.location.pathname;
      const currentPage = currentPath.split("/").pop() || "revision";
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
});
