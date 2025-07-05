// js/timetable-editor.js

// Get all the important elements from the page
const editorTitleEl = document.getElementById('editor-title');
const dateInput = document.getElementById('timetable-date');
const taskListEl = document.getElementById('task-editor-list');
const addTaskBtn = document.getElementById('add-new-task-btn');
const saveBtn = document.getElementById('save-timetable-btn');

let editingDate = null; // This will store the date we are working on

// This is the main function that runs when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Check the URL for a date to determine if we are editing or creating
    const urlParams = new URLSearchParams(window.location.search);
    const dateFromUrl = urlParams.get('date');

    if (dateFromUrl) {
        // EDIT MODE
        editingDate = dateFromUrl;
        editorTitleEl.textContent = 'Edit Timetable';
        dateInput.value = editingDate;
        await loadTasksForDate(editingDate);
    } else {
        // CREATE MODE
        const today = new Date().toISOString().split('T')[0];
        editingDate = today;
        editorTitleEl.textContent = 'Create Timetable';
        dateInput.value = today;
        // Start with one blank task for a better user experience
        createTaskElement();
    }

    // Add event listeners to our buttons
    addTaskBtn.addEventListener('click', () => createTaskElement());
    saveBtn.addEventListener('click', saveTimetable);
    dateInput.addEventListener('change', handleDateChange);

    lucide.createIcons(); // Render all icons
     new Sortable(taskListEl, {
        animation: 150, // The animation speed for the drag
        ghostClass: 'sortable-ghost' // A CSS class for the placeholder
    });
});

// Function to fetch tasks from Supabase if we are in EDIT mode
async function loadTasksForDate(date) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date);
    
    if (error) {
        console.error('Error loading tasks:', error);
        return;
    }

    taskListEl.innerHTML = ''; // Clear the list
    if (tasks.length > 0) {
        tasks.forEach(task => createTaskElement(task));
    } else {
        // If the user navigates to an empty date, give them a blank task to start
        createTaskElement();
    }
}

// The new, simpler function to create a task row
function createTaskElement(task = {}) {
    const li = document.createElement('li');
    li.classList.add('task-editor-item');

    li.innerHTML = `
        <input type="text" class="task-text-input" placeholder="Subject/Chapter" value="${task.text || ''}">
        <input type="number" class="task-duration-input" placeholder="30" min="1" max="480" value="${task.duration_minutes || 30}">
        <span class="duration-label">min</span>
        <button class="delete-task-btn"><i data-lucide="trash-2"></i></button>
    `;

    // Add event listener to the new delete button
    li.querySelector('.delete-task-btn').addEventListener('click', () => {
        li.remove();
    });
    
    taskListEl.appendChild(li);
    lucide.createIcons();
}

// This function handles what happens when the user picks a new date
async function handleDateChange() {
    editingDate = dateInput.value;
    // We can add logic here later to warn user about unsaved changes
    editorTitleEl.textContent = 'Edit Timetable';
    await loadTasksForDate(editingDate);
}

// The FIXED save function
async function saveTimetable() {
    saveBtn.disabled = true;
    // We use loader-2 for a better spinning animation from Lucide icons
    saveBtn.innerHTML = '<i data-lucide="loader-2"></i>'; 
    lucide.createIcons();

    // The magic fix: A tiny delay to let the browser update the icon
    // before we run the heavy database operations.
    setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('You need to be logged in to save.');
            window.location.href = 'auth.html';
            return;
        }

        const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('user_id', user.id)
            .eq('date', editingDate);

        if (deleteError) {
            console.error('Error clearing old tasks:', deleteError);
            alert('Error saving timetable. Please try again.');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save"></i>';
            lucide.createIcons();
            return;
        }

        const taskItems = taskListEl.querySelectorAll('.task-editor-item');
        const newTasksToInsert = [];

        taskItems.forEach(item => {
            const textInput = item.querySelector('.task-text-input').value.trim();
            const durationInput = parseInt(item.querySelector('.task-duration-input').value) || 30;

            // Only add the task if there is text
            if (textInput) {
                newTasksToInsert.push({
                    // These names now EXACTLY match your Supabase columns
                    user_id: user.id,
                    date: editingDate,
                    text: textInput,           // Subject/Chapter
                    duration_minutes: durationInput,  // Duration in minutes
                    completed: false,          // Task completion status
                });
            }
        });

        if (newTasksToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('tasks')
                .insert(newTasksToInsert);

            if (insertError) {
                console.error('Error inserting new tasks:', insertError);
                alert('Error saving new tasks. Please try again.');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i data-lucide="save"></i>';
                lucide.createIcons();
                return;
            }
        }
        
        alert('Timetable saved successfully!');
        window.location.href = 'dashboard.html';

    }, 50); // A 50ms delay is all we need.
}