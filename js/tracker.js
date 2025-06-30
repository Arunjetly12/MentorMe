document.addEventListener('DOMContentLoaded', () => {

    // --- SELECTORS ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const totalStudyTimeEl = document.getElementById('total-study-time');
    const tasksCompletedEl = document.getElementById('tasks-completed');
    const mocksTakenEl = document.getElementById('mocks-taken');
    const avgScoreEl = document.getElementById('avg-score');
    const highestScoreEl = document.getElementById('highest-score');
    const addMockBtn = document.getElementById('add-mock-btn');
    const modal = document.getElementById('add-mock-modal');
    const cancelMockBtn = document.getElementById('cancel-mock-btn');
    const saveMockBtn = document.getElementById('save-mock-btn');
    const mockDateEl = document.getElementById('mock-date');

    // Chart contexts
    const mockTestChartCtx = document.getElementById('mock-test-chart').getContext('2d');
    const subjectStudyChartCtx = document.getElementById('subject-study-chart').getContext('2d');
    let mockTestChart, subjectStudyChart; // To hold chart instances

    let activeFilter = 'weekly';

    // --- DATA HANDLING ---
    // Helper to load data from localStorage
    const loadData = (key) => JSON.parse(localStorage.getItem(key)) || [];
    
    // --- MAIN UPDATE FUNCTION ---
    function updateDashboard() {
        // Load the most recent data
        const allMockTests = loadData('neetMentorMocks');
        const allTasks = loadData('neetMentorTasks');

        // Filter data based on the active filter
        const filteredMocks = filterDataByDate(allMockTests, activeFilter);
        const filteredTasks = filterDataByDate(allTasks, activeFilter);
        
        // Update each card
        updateStatsCard(filteredTasks, filteredMocks);
        updateMockTestCard(filteredMocks);
        updateStudyHabitsCard(allTasks); // For now, this shows all-time habits

        // Set the active class on the correct filter button
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === activeFilter);
        });
    }

    // --- CARD UPDATE FUNCTIONS ---
    function updateStatsCard(tasks, mocks) {
        // NOTE: For study time, we need to modify the dashboard.js to save sessions.
        // For now, it will be 0.
        totalStudyTimeEl.textContent = '0'; 
        tasksCompletedEl.textContent = tasks.filter(task => task.completed).length;
        mocksTakenEl.textContent = mocks.length;
    }

    function updateMockTestCard(mocks) {
        if (!mocks.length) {
            avgScoreEl.textContent = 'N/A';
            highestScoreEl.textContent = 'N/A';
            renderMockTestChart([], []); // Render an empty chart
            return;
        }

        const scores = mocks.map(m => m.total);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const highest = Math.max(...scores);
        
        avgScoreEl.textContent = avg;
        highestScoreEl.textContent = highest;

        // Prepare data for the chart
        const labels = mocks.map(m => new Date(m.date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}));
        const data = mocks.map(m => m.total);
        renderMockTestChart(labels, data);
    }

    function updateStudyHabitsCard(tasks) {
        // Placeholder - this will get better when dashboard saves study sessions
        const subjectCounts = tasks.reduce((acc, task) => {
            const subject = task.text.split(':')[0].trim();
            if(subject) acc[subject] = (acc[subject] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(subjectCounts);
        const data = Object.values(subjectCounts);
        renderSubjectPieChart(labels, data);
    }


    // --- CHART RENDERING ---
    function renderMockTestChart(labels, data) {
        if (mockTestChart) mockTestChart.destroy(); // Destroy old chart before creating new one
        mockTestChart = new Chart(mockTestChartCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Score',
                    data: data,
                    borderColor: '#FFCC00',
                    backgroundColor: 'rgba(255, 204, 0, 0.2)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: { scales: { y: { beginAtZero: false, suggestedMin: 300, suggestedMax: 720 } } }
        });
    }

    function renderSubjectPieChart(labels, data) {
        if (subjectStudyChart) subjectStudyChart.destroy();
        subjectStudyChart = new Chart(subjectStudyChartCtx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tasks by Subject',
                    data: data,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
                }]
            }
        });
    }

    // --- HELPER FUNCTIONS ---
    function filterDataByDate(data, filter) {
        const now = new Date();
        const oneDay = 1000 * 60 * 60 * 24;

        return data.filter(item => {
            const itemDate = new Date(item.date);
            const diffDays = Math.round((now - itemDate) / oneDay);

            if (filter === 'daily') return diffDays <= 1;
            if (filter === 'weekly') return diffDays <= 7;
            if (filter === 'monthly') return diffDays <= 30;
            return true; // for 'all time' if we add it
        });
    }

    // --- MODAL & DATA SAVING LOGIC ---
    function showModal() {
        mockDateEl.valueAsDate = new Date(); // Pre-fill today's date
        modal.classList.add('show');
    }
    function hideModal() {
        modal.classList.remove('show');
    }

    function saveMockTest() {
        const date = mockDateEl.value;
        const physics = parseInt(document.getElementById('physics-score').value, 10);
        const chemistry = parseInt(document.getElementById('chemistry-score').value, 10);
        const biology = parseInt(document.getElementById('biology-score').value, 10);

        if (!date || isNaN(physics) || isNaN(chemistry) || isNaN(biology)) {
            alert('Please fill in all fields with valid numbers.');
            return;
        }

        const newMock = {
            date: date,
            physics: physics,
            chemistry: chemistry,
            biology: biology,
            total: physics + chemistry + biology
        };

        const allMocks = loadData('neetMentorMocks');
        allMocks.push(newMock);
        // Sort by date to keep the chart chronological
        allMocks.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        localStorage.setItem('neetMentorMocks', JSON.stringify(allMocks));
        
        hideModal();
        updateDashboard();
    }

    // --- EVENT LISTENERS ---
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            activeFilter = btn.dataset.filter;
            updateDashboard();
        });
    });

    addMockBtn.addEventListener('click', showModal);
    cancelMockBtn.addEventListener('click', hideModal);
    saveMockBtn.addEventListener('click', saveMockTest);
    modal.addEventListener('click', (e) => (e.target === modal) && hideModal());
    
    // --- NAV LINK & INITIAL LOAD ---
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = location.pathname.split("/").pop();
    navLinks.forEach(link => {
        if (link.getAttribute("href") === currentPage) link.classList.add("active");
        else link.classList.remove("active");
    });
    lucide.createIcons();
    updateDashboard(); // Initial load
});