// js/supabase-client.js

// These are your unique project details from supabase.com
const SUPABASE_URL = 'https://icbgbhafcxgtpnlwxvti.supabase.co'; // Paste your URL here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljYmdiaGFmY3hndHBubHd4dnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNjQ3NzUsImV4cCI6MjA2Njc0MDc3NX0.0QdJBZWOTXE6PwrSYpjjxPP3PRbVgXezN7o4r_fi5hk'; // Paste your anon key here

// This is the **correct** way to initialize the client.
// We create a global 'supabase' variable that all other scripts can use.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);