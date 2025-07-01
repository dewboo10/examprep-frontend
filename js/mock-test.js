const API_BASE = 'https://examprep-backend.onrender.com';

// Initialize state
let state = {
    currentSection: 'VARC',
    currentQuestionIndex: 0,
    answers: {},
    flags: {},
    visited: {},
    timeLeft: 5400, // 90 minutes in seconds
    questions: null,
    timerId: null,
    isReview: false,
    testStartTime: null
};

// DOM Elements
const elements = {
    timer: document.getElementById('timer'),
    currentSection: document.getElementById('current-section'),
    sections: document.getElementById('sections'),
    passage: document.getElementById('passage'),
    questionNumber: document.getElementById('question-number'),
    questionText: document.getElementById('question-text'),
    options: document.getElementById('options'),
    questionNavigator: document.getElementById('question-navigator'),
    markReviewBtn: document.getElementById('mark-review-btn'),
    clearBtn: document.getElementById('clear-btn'),
    saveNextBtn: document.getElementById('save-next-btn'),
    submitBtn: document.getElementById('submit-btn'),
    startTestBtn: document.getElementById('start-test-btn'),
    countdown: document.getElementById('countdown'),
    instructionsModal: document.getElementById('instructions-modal')
};

// Check authentication and initialize
async function init() {
    const params = new URLSearchParams(window.location.search);
    const exam = params.get("exam");
    const day = params.get("day");
    const token = localStorage.getItem("token");

    if (!token) {
        alert("You must be logged in to take the quiz.");
        window.location.href = "/login.html";
        return;
    }

    if (exam) localStorage.setItem('selectedExam', exam);
    if (day) localStorage.setItem('selectedDay', day);

    // Check if already submitted
    await checkAlreadySubmitted(exam, day, token);

    // Check for persisted state
    const persisted = loadPersistedState();
    
    // If in review mode, skip the modal
    const attempts = JSON.parse(localStorage.getItem(`mockAttempts_${exam}`) || '{}');
    state.isReview = attempts[`mock${day}`] === 'completed';

    if (state.isReview) {
        await initializeTest();
        return;
    }

    // Show instructions modal
    let countdown = 30;
    const countdownInterval = setInterval(() => {
        countdown--;
        elements.countdown.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            elements.startTestBtn.disabled = false;
            elements.startTestBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            elements.startTestBtn.classList.add('hover:bg-blue-600');
        }
    }, 1000);

    // Start test immediately if user clicks button
    elements.startTestBtn.addEventListener('click', async () => {
        clearInterval(countdownInterval);
        elements.instructionsModal.style.opacity = '0';
        setTimeout(() => {
            elements.instructionsModal.style.display = 'none';
        }, 300);
        await initializeTest();
    });

    // Load questions in background while showing modal
    try {
        if (!persisted) {
            await loadQuestions();
        } else {
            // If we have persisted state, questions are already loaded
            initializeTest();
        }
    } catch (err) {
        showError("❌ Failed to load questions.");
        console.error(err);
    }
}

// Load questions from API
async function loadQuestions() {
    const exam = localStorage.getItem('selectedExam');
    const day = localStorage.getItem('selectedDay') || 1;
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE}/api/questions?exam=${exam}&day=${day}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    state.questions = await response.json();
    initializeState();
}

// Initialize answer and visited states
function initializeState() {
    Object.keys(state.questions).forEach(section => {
        state.answers[section] = Array(state.questions[section].length).fill(null);
        state.flags[section] = Array(state.questions[section].length).fill(false);
        state.visited[section] = Array(state.questions[section].length).fill(false);
    });
    state.visited[state.currentSection][state.currentQuestionIndex] = true;
}

// Initialize the test (after modal)
async function initializeTest() {
    renderSections();
    renderQuestion();
    renderQuestionNavigator();
    setupEventListeners();
    
    if (!state.isReview) {
        startTestTimer();
    } else {
        elements.submitBtn.style.display = 'none';
    }
}

// Render section tabs
function renderSections() {
    if (!state.questions || typeof state.questions !== 'object') {
        showError("Questions not loaded. Please refresh the page or try again later. If the problem persists, clear your browser's saved data for this test from Application/LocalStorage.");
        return;
    }
    elements.sections.innerHTML = Object.keys(state.questions).map(section => `
        <button class="px-4 py-2 rounded-lg transition-all 
            ${section === state.currentSection ? 
                'bg-blue-500 text-white' : 
                'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            ${state.isReview ? 'cursor-pointer' : ''}"
            data-section="${section}">
            ${section}
        </button>
    `).join('');
}

// Render question navigator panel
function renderQuestionNavigator() {
    elements.questionNavigator.innerHTML = '';
    const questions = state.questions[state.currentSection];
    
    questions.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.className = 'w-full py-2 rounded flex justify-center items-center transition-all';
        btn.textContent = index + 1;
        
        // Set button style based on state
        if (state.answers[state.currentSection][index] !== null) {
            btn.classList.add('answered');
        } else if (state.visited[state.currentSection][index]) {
            btn.classList.add('not-answered');
        }
        
        if (state.flags[state.currentSection][index]) {
            btn.classList.add('marked-review');
        }
        
        if (index === state.currentQuestionIndex) {
            btn.classList.add('ring-2', 'ring-blue-500');
        }
        
        btn.addEventListener('click', () => {
            state.currentQuestionIndex = index;
            state.visited[state.currentSection][index] = true;
            renderQuestion();
            updateQuestionNavigator();
            persistState();
        });
        
        elements.questionNavigator.appendChild(btn);
    });
}

// Render current question
function renderQuestion() {
    const question = state.questions[state.currentSection][state.currentQuestionIndex];

    // Update question number
    elements.questionNumber.textContent = state.currentQuestionIndex + 1;

    // Render passage + image
    elements.passage.innerHTML = ''; // Clear previous

    if (question.passage || question.img) {
        let passageHTML = '';

        // If passage is an array of strings
        if (Array.isArray(question.passage)) {
            passageHTML += question.passage.map(p => `<p class="mb-3">${p}</p>`).join('');
        }
        // If passage is a single string
        else if (typeof question.passage === 'string') {
            // Convert actual newlines into <br><br> for proper paragraph spacing
            const formatted = question.passage.replace(/\n/g, '<br><br>');
            passageHTML += `<p class="mb-3">${formatted}</p>`;
        }

        // If image is present, add image HTML
        if (question.img) {
            passageHTML += `<img src="${question.img}" alt="diagram" class="mt-4 max-w-full rounded border shadow">`;
        }

        elements.passage.innerHTML = passageHTML;
        elements.passage.classList.remove('hidden');
    } else {
        elements.passage.innerHTML = '';
        elements.passage.classList.add('hidden');
    }

    // Render question text
    elements.questionText.innerHTML = question.question;

    // Render options
    elements.options.innerHTML = '';
    question.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = `flex items-center space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer option-card 
            ${state.isReview ? 
                (index === question.answerIndex ? 'correct' : 
                (state.answers[state.currentSection][state.currentQuestionIndex] === index ? 'wrong' : '')) : ''}`;

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'option';
        input.value = index;
        input.className = 'h-5 w-5';
        if (state.answers[state.currentSection][state.currentQuestionIndex] === index) {
            input.checked = true;
        }
        input.addEventListener('change', () => selectAnswer(index));

        const label = document.createElement('label');
        label.className = 'flex-1';
        label.textContent = option;
        label.addEventListener('click', () => selectAnswer(index));

        div.appendChild(input);
        div.appendChild(label);
        elements.options.appendChild(div);
    });

    // Update section name
    elements.currentSection.textContent = state.currentSection;

    // Update navigator colors
    updateQuestionNavigator();
}
// Update question navigator styles
function updateQuestionNavigator() {
    const buttons = elements.questionNavigator.querySelectorAll('button');
    buttons.forEach((btn, index) => {
        btn.className = 'w-full py-2 rounded flex justify-center items-center transition-all';
        
        if (state.answers[state.currentSection][index] !== null) {
            btn.classList.add('answered');
        } else if (state.visited[state.currentSection][index]) {
            btn.classList.add('not-answered');
        }
        
        if (state.flags[state.currentSection][index]) {
            btn.classList.add('marked-review');
        }
        
        if (index === state.currentQuestionIndex) {
            btn.classList.add('ring-2', 'ring-blue-500');
        }
    });
}

// Handle answer selection
function selectAnswer(index) {
    state.answers[state.currentSection][state.currentQuestionIndex] = index;
    updateQuestionNavigator();
    persistState();
}

// Start timer
function startTestTimer() {
    // Clear any existing timer
    if (state.timerId) clearInterval(state.timerId);
    
    // Check for saved start time
    const savedStart = localStorage.getItem("testStartTime");
    const now = Date.now();
    
    if (savedStart) {
        state.testStartTime = parseInt(savedStart);
    } else {
        state.testStartTime = now;
        localStorage.setItem("testStartTime", state.testStartTime);
    }
    
    // Calculate initial time left
    const elapsed = Math.floor((now - state.testStartTime) / 1000);
    state.timeLeft = Math.max(0, 5400 - elapsed);
    updateTimerDisplay();
    
    // Start countdown
    state.timerId = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();
        
        if (state.timeLeft <= 0) {
            clearInterval(state.timerId);
            submitTest();
        }
        
        // Auto-switch sections based on time
        const sectionOrder = ["VARC", "LRDI", "Quant"];
        const sectionDuration = 1800; // 30 minutes per section
        
        const sectionIndex = Math.floor((5400 - state.timeLeft) / sectionDuration);
        if (sectionIndex >= sectionOrder.length) return;
        
        const nextSection = sectionOrder[sectionIndex];
        if (nextSection !== state.currentSection) {
            state.currentSection = nextSection;
            state.currentQuestionIndex = 0;
            renderSections();
            renderQuestion();
            renderQuestionNavigator();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    elements.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Set up event listeners
function setupEventListeners() {
    // Section switching
    elements.sections.addEventListener('click', (e) => {
        const section = e.target.dataset.section;
        if (!section) return;
        
        if (!state.isReview && section !== state.currentSection) {
            alert("Section locked! Wait for timer to switch automatically.");
            return;
        }
        
        state.currentSection = section;
        state.currentQuestionIndex = 0;
        renderSections();
        renderQuestion();
        renderQuestionNavigator();
        persistState();
    });
    
    // Mark for Review
    elements.markReviewBtn.addEventListener('click', () => {
        state.flags[state.currentSection][state.currentQuestionIndex] = 
            !state.flags[state.currentSection][state.currentQuestionIndex];
        navigate(1);
        updateQuestionNavigator();
        persistState();
    });
    
    // Clear Response
    elements.clearBtn.addEventListener('click', () => {
        state.answers[state.currentSection][state.currentQuestionIndex] = null;
        renderQuestion();
        updateQuestionNavigator();
        persistState();
    });
    
    // Save & Next
    elements.saveNextBtn.addEventListener('click', () => {
        navigate(1);
    });
    
    // Submit
    elements.submitBtn.addEventListener('click', submitTest);
}

// Navigate between questions
function navigate(dir) {
    const newIndex = state.currentQuestionIndex + dir;
    const questions = state.questions[state.currentSection];
    
    if (newIndex >= 0 && newIndex < questions.length) {
        state.currentQuestionIndex = newIndex;
        state.visited[state.currentSection][newIndex] = true;
        renderQuestion();
        persistState();
    }
}

// Submit test
async function submitTest() {
    clearInterval(state.timerId);
    
    try {
        const token = localStorage.getItem('token');
        const exam = localStorage.getItem('selectedExam');
        const day = localStorage.getItem('selectedDay') || 1;
        
        const response = await fetch(`${API_BASE}/api/mock/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                exam,
                day,
                answers: state.answers,
                flags: state.flags,
                timeSpent: 5400 - state.timeLeft
            })
        });
        
        const result = await response.json();
        if (result.success) {
            localStorage.removeItem("testStartTime");
            localStorage.removeItem(`mockState_${exam}_Day${day}`);
            
            const attempts = JSON.parse(localStorage.getItem(`mockAttempts_${exam}`) || '{}');
            attempts[`mock${day}`] = 'completed';
            localStorage.setItem(`mockAttempts_${exam}`, JSON.stringify(attempts));
            
            alert("Test submitted successfully!");
            window.location.href = `review.html?exam=${exam}&day=${day}`;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Submission failed:", error);
        alert("Failed to submit test. Please try again.");
    }
}

// Persist state to localStorage
function persistState() {
    const exam = localStorage.getItem('selectedExam');
    const day = localStorage.getItem('selectedDay') || 1;
    localStorage.setItem(`mockState_${exam}_Day${day}`, JSON.stringify(state));
}

// Load persisted state
function loadPersistedState() {
    const exam = localStorage.getItem('selectedExam');
    const day = localStorage.getItem('selectedDay') || 1;
    const saved = JSON.parse(localStorage.getItem(`mockState_${exam}_Day${day}`));

    if (saved) {
        state = { ...state, ...saved };
        return true;
    }
    return false;
}

// Check if test already submitted
async function checkAlreadySubmitted(exam, day, token) {
    try {
        const res = await fetch(`${API_BASE}/api/mock?exam=${exam}&day=${day}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (data.submitted) {
            alert("You've already submitted this test.");
            window.location.href = "/dashboard.html";
        }
    } catch (error) {
        console.error("Failed to check submission status:", error);
    }
}

// Error handler
function showError(msg) {
    alert(msg);
}

// Fix for browser back/forward navigation
window.onpageshow = function (event) {
    if (event.persisted) {
        location.reload();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);