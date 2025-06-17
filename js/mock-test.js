const API_BASE = 'https://examprep-backend.onrender.com';

// Initialize state
let state = {
    currentSection: 'VARC',
    currentQuestionIndex: 0,
    answers: {},
    flags: {},
    visited: {},
    timeLeft: 7200, // 120 minutes in seconds
    questions: null,
    timerId: null,
    isReview: false
};

// DOM Elements
const elements = {
    timer: document.getElementById('timer'),
    currentSection: document.getElementById('current-section'),
    passage: document.getElementById('passage'),
    questionNumber: document.getElementById('question-number'),
    questionText: document.getElementById('question-text'),
    options: document.getElementById('options'),
    questionNavigator: document.getElementById('question-navigator'),
    markReviewBtn: document.getElementById('mark-review-btn'),
    clearBtn: document.getElementById('clear-btn'),
    saveNextBtn: document.getElementById('save-next-btn'),
    submitBtn: document.getElementById('submit-btn')
};

// Check authentication and initialize
async function init() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to take the quiz.");
        window.location.href = "/login.html";
        return;
    }

    // Check if already submitted
    const exam = new URLSearchParams(window.location.search).get("exam");
    const day = new URLSearchParams(window.location.search).get("day");
    await checkAlreadySubmitted(exam, day, token);

    // Load questions
    try {
        const persisted = loadPersistedState();
        if (!persisted) {
            await loadQuestions();
        }

        // Initialize UI
        initializeState();
        renderQuestionNavigator();
        renderQuestion();
        startTimer();

        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error("Initialization failed:", error);
        alert("Failed to initialize test. Please try again.");
    }
}

// Load questions from API
async function loadQuestions() {
    const exam = localStorage.getItem('selectedExam') || 'CAT';
    const day = localStorage.getItem('selectedDay') || 1;
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE}/api/questions?exam=${exam}&day=${day}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    state.questions = await response.json();
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
            btn.classList.add('bg-green-500', 'text-white');
        } else if (state.visited[state.currentSection][index]) {
            btn.classList.add('bg-red-500', 'text-white');
        }
        
        if (state.flags[state.currentSection][index]) {
            btn.classList.add('border-2', 'border-yellow-500');
        }
        
        if (index === state.currentQuestionIndex) {
            btn.classList.add('ring-2', 'ring-blue-500');
        }
        
        btn.addEventListener('click', () => {
            state.currentQuestionIndex = index;
            state.visited[state.currentSection][index] = true;
            renderQuestion();
            updateQuestionNavigator();
        });
        
        elements.questionNavigator.appendChild(btn);
    });
}

// Render current question
function renderQuestion() {
    const question = state.questions[state.currentSection][state.currentQuestionIndex];
    
    // Update question number
    elements.questionNumber.textContent = state.currentQuestionIndex + 1;
    
    // Render passage if available
    if (question.passage) {
        elements.passage.innerHTML = Array.isArray(question.passage) ? 
            question.passage.join('<br><br>') : question.passage;
    } else {
        elements.passage.innerHTML = 'No passage for this question';
    }
    
    // Render question text
    elements.questionText.innerHTML = question.question;
    
    // Render options
    elements.options.innerHTML = '';
    question.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer';
        
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
    updateQuestionNavigator();
}

// Update question navigator styles
function updateQuestionNavigator() {
    const buttons = elements.questionNavigator.querySelectorAll('button');
    buttons.forEach((btn, index) => {
        btn.className = 'w-full py-2 rounded flex justify-center items-center transition-all';
        
        if (state.answers[state.currentSection][index] !== null) {
            btn.classList.add('bg-green-500', 'text-white');
        } else if (state.visited[state.currentSection][index]) {
            btn.classList.add('bg-red-500', 'text-white');
        }
        
        if (state.flags[state.currentSection][index]) {
            btn.classList.add('border-2', 'border-yellow-500');
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
function startTimer() {
    // Clear any existing timer
    if (state.timerId) clearInterval(state.timerId);
    
    // Update timer display immediately
    updateTimerDisplay();
    
    // Start countdown
    state.timerId = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();
        
        if (state.timeLeft <= 0) {
            clearInterval(state.timerId);
            submitTest();
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
function navigate(offset) {
    const newIndex = state.currentQuestionIndex + offset;
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
                timeSpent: 7200 - state.timeLeft
            })
        });
        
        const result = await response.json();
        if (result.success) {
            alert("Test submitted successfully!");
            window.location.href = "/dashboard.html";
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);