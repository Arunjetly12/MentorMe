// js/test.js

// This function runs automatically
async function runTest() {
    console.log("Attempting to connect to Supabase...");

    // Try to get all items from the 'tasks' table
    const { data, error } = await supabase
        .from('tasks')
        .select('*');

    // Check what we got back
    if (error) {
        // If there was an error, show it in the console in red
        console.error("---Supabase Error---");
        console.error(error);
    } else {
        // If it worked, show the data
        console.log("---Supabase Connection SUCCESS!---");
        console.log("Data received:", data);
    }
}

runTest();