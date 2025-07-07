// js/supabase-client.js

// These are your unique project details from supabase.com
const SUPABASE_URL = 'https://icbgbhafcxgtpnlwxvti.supabase.co'; // Paste your URL here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljYmdiaGFmY3hndHBubHd4dnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODQ0NDAsImV4cCI6MjA2NzQ2MDQ0MH0.KY6fpN_Y5RQB0X4NwzW5q-TcR8fnWxQKYzRjXx6Q4SY'; // Paste your anon key here

// This is the **correct** way to initialize the client.
// We create a global 'supabase' variable that all other scripts can use.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);