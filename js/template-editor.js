// js/template-editor.js (DATE-AWARE VERSION)

// Get references to all the HTML elements we need to update
const templateTitleEl = document.getElementById('template-title');
const templateDescriptionEl = document.getElementById('template-description');
const taskPreviewListEl = document.getElementById('task-preview-list');
const useTemplateBtn = document.getElementById('use-template-btn');

let templateTasks = []; // We'll store the fetched tasks here

// This function runs as soon as the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get the template ID from the URL (e.g., ?id=1)
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('id');

    if (!templateId) {
        templateTitleEl.textContent = 'Error';
        templateDescriptionEl.textContent = 'No template ID provided.';
        return;
    }

    // 2. Fetch the template's main details AND its tasks from Supabase
    await fetchTemplateDetails(templateId);

    // 3. Render the icons on the page
    lucide.createIcons();
});

// Function to fetch all data from Supabase
async function fetchTemplateDetails(templateId) {
    // Fetch the main template info (name, description)
    const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single(); // .single() gets one record instead of an array

    // Fetch the list of tasks for this template, ordered correctly
    const { data: tasks, error: tasksError } = await supabase
        .from('template_tasks')
        .select('*')
        .eq('template_id', templateId)
        .order('order', { ascending: true });
    
    // Handle any errors
    if (templateError || tasksError) {
        console.error('Error fetching template details:', templateError || tasksError);
        templateTitleEl.textContent = 'Error';
        templateDescriptionEl.textContent = 'Could not load template details.';
        return;
    }
    
    // Store tasks globally for later use
    templateTasks = tasks;

    // 4. Update the page with the fetched data
    templateTitleEl.textContent = template.name;
    templateDescriptionEl.textContent = template.description;
    
    // Clear the loading list
    taskPreviewListEl.innerHTML = '';

    // Create and display each task in the preview list
    tasks.forEach(task => {
        const listItem = document.createElement('li');
        listItem.classList.add('task-preview-item');
        listItem.innerHTML = `
            <span class="task-text">${task.task_text}</span>
            <span class="task-duration">${task.duration_minutes} min</span>
        `;
        taskPreviewListEl.appendChild(listItem);
    });

    // 5. Enable the "Use Template" button now that data is loaded
    useTemplateBtn.classList.remove('disabled');
    useTemplateBtn.disabled = false;
}

// Add the click event listener for the "Use Template" button
useTemplateBtn.addEventListener('click', async () => {
    // Disable the button to prevent double-clicks
    useTemplateBtn.disabled = true;
    useTemplateBtn.textContent = 'Applying...';

    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        alert('You must be logged in to apply a template.');
        window.location.href = 'auth.html'; // Redirect to login if not logged in
        return;
    }

    // --- THIS IS THE CRUCIAL FIX ---
    // Get today's date in YYYY-MM-DD format for Supabase
    const todayDateStr = new Date().toISOString().split('T')[0];

    // A. Delete all of the user's existing tasks FOR TODAY ONLY
    const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('date', todayDateStr); // This prevents deleting tasks scheduled for other days!
    
    if (deleteError) {
        console.error('Error deleting old tasks:', deleteError);
        alert('Could not clear old timetable. Please try again.');
        useTemplateBtn.disabled = false;
        useTemplateBtn.textContent = 'Use This Template';
        return;
    }

    // B. Prepare the new tasks to be inserted
    const newTasksToInsert = templateTasks.map(task => ({
        user_id: user.id,
        task_text: task.task_text,
        total_seconds: task.duration_minutes * 60,
        is_done: false, 
        time_left: task.duration_minutes * 60,

        // --- AND WE ADD THE DATE HERE ---
        date: todayDateStr 
    }));

    // C. Insert the new tasks into the user's timetable
    const { error: insertError } = await supabase
        .from('tasks')
        .insert(newTasksToInsert);

    if (insertError) {
        console.error('Error inserting new tasks:', insertError);
        alert('Could not apply the new template. Please try again.');
        useTemplateBtn.disabled = false;
        useTemplateBtn.textContent = 'Use This Template';
        return;
    }

    // D. Success! Redirect back to the dashboard.
    alert('Template applied successfully!');
    window.location.href = 'dashboard.html';
});

