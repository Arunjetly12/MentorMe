// --- JS/MOTIVATION.JS (Supabase Version with Debugging) ---

document.addEventListener('DOMContentLoaded', async () => {

    console.log("Motivation.js script started!");

    // --- SELECTORS & DEBUGGING ---
    // Let's check if we are finding the elements correctly.
    const quoteDisplay = document.querySelector('#quote-display');
    const authorDisplay = document.querySelector('#author-display');
    const newQuoteBtn = document.querySelector('#new-quote-btn');
    
    console.log("Quote Display Element:", quoteDisplay); // Should show the HTML element, NOT null.
    console.log("New Quote Button:", newQuoteBtn);     // Should show the button, NOT null.

    // --- DATA ---
    let quotes = [];

    // --- **NEW** SUPABASE FUNCTION ---
    async function loadQuotes() {
        console.log("Attempting to load quotes from Supabase...");
        
        const { data, error } = await supabase
            .from('quotes')
            .select('*');

        if (error) {
            console.error("Supabase Error:", error);
            quoteDisplay.textContent = '"The journey of a thousand miles begins with a single step."';
            authorDisplay.textContent = '- Lao Tzu';
        } else {
            console.log("Successfully loaded quotes:", data);
            quotes = data;
        }
    }

    // --- FUNCTIONS ---
    function showNewQuote() {
        // This is a "guard clause". If selectors failed, it prevents a crash.
        if (!quoteDisplay || !authorDisplay) {
            console.error("Cannot show quote because display elements were not found!");
            return;
        }
        if (quotes.length === 0) return; 

        const randomIndex = Math.floor(Math.random() * quotes.length);
        const randomQuote = quotes[randomIndex];
        quoteDisplay.textContent = `"${randomQuote.text}"`;
        authorDisplay.textContent = `- ${randomQuote.author}`;
    }

    // --- EVENT LISTENERS ---
    // Another guard clause to prevent errors if the button isn't found
    if (newQuoteBtn) {
        newQuoteBtn.addEventListener('click', showNewQuote);
    }

    // --- INITIAL EXECUTION ---
    await loadQuotes(); 
    showNewQuote();

    // --- ACTIVE NAV LINK FIX ---
    // Netlify-compatible navigation active state
    function setActiveNavLink() {
      const navLinks = document.querySelectorAll('.nav-link');
      
      // First, remove all active classes
      navLinks.forEach(link => link.classList.remove("active"));
      
      // Get current page name - handle Netlify's clean URLs
      const currentPath = window.location.pathname;
      const currentPage = currentPath.split("/").pop() || "motivation";
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
    
    // **FIXED** This now runs safely inside the DOMContentLoaded listener.
    lucide.createIcons();
    console.log("Motivation.js script finished!");
});