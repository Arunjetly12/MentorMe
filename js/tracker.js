// --- JS/TRACKER.JS (Final Supabase & Charts Version) ---

// Global function for deleting individual mock tests
async function deleteMockTest(testId) {
    if (!confirm("Are you sure you want to delete this mock test result?")) {
        return;
    }

    const { error } = await supabase
        .from('mock_tests')
        .delete()
        .eq('id', testId);

    if (error) {
        console.error("Error deleting mock test:", error);
        alert("Failed to delete mock test.");
    } else {
        // Reload all data and charts by calling the global loadAllData function
        if (window.loadAllData) {
            await window.loadAllData();
        }
        // Also trigger a page reload as a fallback
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- SELECTORS ---
    const tasksCompletedEl = document.getElementById('tasks-completed');
    const mocksTakenEl = document.getElementById('mocks-taken');
    const avgScoreEl = document.getElementById('avg-score');
    const highestScoreEl = document.getElementById('highest-score');
    
    const addMockBtn = document.getElementById('add-mock-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const modal = document.getElementById('add-mock-modal');
    const cancelMockBtn = document.getElementById('cancel-mock-btn');
    const saveMockBtn = document.getElementById('save-mock-btn');
    const mockDateInput = document.getElementById('mock-date');
    const physicsScoreInput = document.getElementById('physics-score');
    const chemistryScoreInput = document.getElementById('chemistry-score');
    const biologyScoreInput = document.getElementById('biology-score');
    const mockTestListEl = document.getElementById('mock-test-list');

    // --- CHART SETUP ---
    const mockTestCtx = document.getElementById('mock-test-chart').getContext('2d');
    const mockTestChart = new Chart(mockTestCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Total Score (out of 720)', data: [], borderColor: '#FFCC00', tension: 0.1 }] },
        options: { scales: { y: { beginAtZero: false, max: 720 } } }
    });

    const subjectStudyCtx = document.getElementById('subject-study-chart').getContext('2d');
    const subjectStudyChart = new Chart(subjectStudyCtx, {
        type: 'doughnut',
        data: { labels: ['Physics', 'Chemistry', 'Biology'], datasets: [{ data: [0,0,0], backgroundColor: ['#007bff', '#28a745', '#dc3545'] }] }
    });

    // --- SUPABASE FUNCTIONS ---
    async function loadAllData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch mock tests for the logged-in user
        const { data: mockTests, error: mockError } = await supabase
            .from('mock_tests')
            .select('*')
            .eq('user_id', user.id)
            .order('test_date', { ascending: true });

        if (mockError) {
            console.error("Error fetching mock tests:", mockError);
        } else {
            // Once data is loaded, update the cards and charts
            updateStatsCard(mockTests);
            renderMockTestChart(mockTests);
            renderSubjectChart(mockTests);
            renderMockTestList(mockTests);
        }
        
        // Fetch completed tasks for the stats card
        const { data: tasks, error: taskError } = await supabase
            .from('tasks')
            .select('id', { count: 'exact' }) // More efficient way to get a count
            .eq('user_id', user.id)
            .eq('completed', true);

        if(!taskError){
            tasksCompletedEl.textContent = tasks.length;
        }
    }

    // Make loadAllData globally accessible
    window.loadAllData = loadAllData;

    async function addMockTest() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("You must be logged in."); return; }

        const newMock = {
            user_id: user.id,
            test_date: mockDateInput.value,
            physics_score: parseInt(physicsScoreInput.value) || 0,
            chemistry_score: parseInt(chemistryScoreInput.value) || 0,
            biology_score: parseInt(biologyScoreInput.value) || 0,
        };

        if(!newMock.test_date){
            alert("Please select a test date.");
            return;
        }

        const { error } = await supabase.from('mock_tests').insert([newMock]);
        if (error) {
            console.error("Error saving mock test:", error);
            alert("Failed to save result.");
        } else {
            hideModal();
            loadAllData(); // Reload all data and charts
        }
    }

    async function resetAllMockTests() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("You must be logged in."); return; }

        if (!confirm("Are you sure you want to delete ALL mock test results? This action cannot be undone.")) {
            return;
        }

        const { error } = await supabase
            .from('mock_tests')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            console.error("Error deleting mock tests:", error);
            alert("Failed to reset scores.");
        } else {
            loadAllData(); // Reload all data and charts
        }
    }

    // --- RENDER & CALCULATION FUNCTIONS ---
    function updateStatsCard(mockTests) {
        mocksTakenEl.textContent = mockTests.length;
        if (mockTests.length === 0) {
            avgScoreEl.textContent = 'N/A';
            highestScoreEl.textContent = 'N/A';
            return;
        }

        let totalScoreSum = 0;
        let highestScore = 0;
        mockTests.forEach(test => {
            const total = test.physics_score + test.chemistry_score + test.biology_score;
            totalScoreSum += total;
            if (total > highestScore) {
                highestScore = total;
            }
        });
        
        const avgScore = Math.round(totalScoreSum / mockTests.length);
        avgScoreEl.textContent = avgScore;
        highestScoreEl.textContent = highestScore;
    }

    function renderMockTestChart(mockTests) {
        mockTestChart.data.labels = mockTests.map(t => new Date(t.test_date + 'T00:00:00').toLocaleDateString('en-GB', {day:'2-digit', month:'short'}));
        mockTestChart.data.datasets[0].data = mockTests.map(t => t.physics_score + t.chemistry_score + t.biology_score);
        mockTestChart.update();
    }
    
    function renderSubjectChart(mockTests) {
        if (mockTests.length > 0) {
            const totalPhysics = mockTests.reduce((sum, test) => sum + test.physics_score, 0);
            const totalChemistry = mockTests.reduce((sum, test) => sum + test.chemistry_score, 0);
            const totalBiology = mockTests.reduce((sum, test) => sum + test.biology_score, 0);
            subjectStudyChart.data.datasets[0].data = [totalPhysics, totalChemistry, totalBiology];
            subjectStudyChart.update();
        }
    }

    function renderMockTestList(mockTests) {
        if (mockTests.length === 0) {
            mockTestListEl.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">No mock tests added yet.</p>';
            return;
        }

        mockTestListEl.innerHTML = mockTests.map(test => {
            const total = test.physics_score + test.chemistry_score + test.biology_score;
            const date = new Date(test.test_date + 'T00:00:00').toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            
            return `
                <div class="mock-test-item">
                    <div class="mock-test-info">
                        <div class="mock-test-date">${date}</div>
                        <div class="mock-test-scores">
                            P: ${test.physics_score} | C: ${test.chemistry_score} | B: ${test.biology_score}
                            <span class="mock-test-total">Total: ${total}</span>
                        </div>
                    </div>
                    <button class="delete-btn" onclick="deleteMockTest(${test.id})">Delete</button>
                </div>
            `;
        }).join('');
    }

    // --- MODAL & EVENT LISTENERS ---
    const showModal = () => {
        mockDateInput.valueAsDate = new Date(); // Pre-fill today's date
        modal.classList.add('show');
    }
    const hideModal = () => {
        modal.classList.remove('show');
        addMockBtn.closest('form')?.reset(); // A safer way to reset the form if it exists
    };

    addMockBtn.addEventListener('click', showModal);
    resetAllBtn.addEventListener('click', resetAllMockTests);
    cancelMockBtn.addEventListener('click', hideModal);
    saveMockBtn.addEventListener('click', addMockTest);
    modal.addEventListener('click', (e) => e.target === modal && hideModal());
    
    // --- INITIAL LOAD & NAV FIX ---
    loadAllData();
    lucide.createIcons();
    
    // Netlify-compatible navigation active state
    function setActiveNavLink() {
      const navLinks = document.querySelectorAll('.nav-link');
      
      // First, remove all active classes
      navLinks.forEach(link => link.classList.remove("active"));
      
      // Get current page name - handle Netlify's clean URLs
      const currentPath = window.location.pathname;
      const currentPage = currentPath.split("/").pop() || "tracker";
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
});