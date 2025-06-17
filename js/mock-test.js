const API_BASE = 'https://examprep-backend.onrender.com';

const params = new URLSearchParams(window.location.search);
const exam = params.get("exam");
const day = params.get("day");
const token = localStorage.getItem("token");

if (!token) {
  alert("You must be logged in to take the quiz.");
  window.location.href = "/login.html";
}

checkAlreadySubmitted(exam, day, token);

let state = {
  currentSection: 'VARC',
  currentQuestionIndex: 0,
  answers: {},
  flags: {},
  timeLeft: 1800,
  questions: null,
  timerId: null,
  isReview: false
};

const elements = {
  timer: document.getElementById('timer'),
  sections: document.getElementById('sections'),
  questionNumber: document.getElementById('question-number'),
  questionText: document.getElementById('question-text'),
  options: document.getElementById('options'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  flagBtn: document.getElementById('flag-btn'),
  explanation: document.getElementById('explanation'),
  resultContainer: document.getElementById('result-container'),
  scoreDisplay: document.getElementById('score-display'),
  detailedResults: document.getElementById('detailed-results'),
  submitBtn: document.getElementById('submit-btn'),
  passage: document.getElementById('passage')
};

// 🧠 Restore quiz state if it exists
function loadPersistedState() {
  const exam = localStorage.getItem('selectedExam');
  const day = localStorage.getItem('selectedDay') || 1;
  const saved = JSON.parse(localStorage.getItem(`mockState_${exam}_Day${day}`));

  if (saved && saved.questions) {
    state = { ...state, ...saved };
    if (saved.timeLeft && saved.timeLeft > 0) {
      state.timeLeft = saved.timeLeft;
    }
    return true;
  }
  return false;
}

// 💾 Save quiz progress
function persistState() {
  const exam = localStorage.getItem('selectedExam');
  const day = localStorage.getItem('selectedDay') || 1;
  localStorage.setItem(`mockState_${exam}_Day${day}`, JSON.stringify(state));
}

// 📚 Fetch questions from API
async function loadQuestions() {
  try {
    const exam = localStorage.getItem('selectedExam');
    const token = localStorage.getItem('token');
    if (!exam || !token) throw new Error('Missing exam or login');

    const day = localStorage.getItem('selectedDay') || 1;
    const res = await fetch(`${API_BASE}/api/questions?exam=${exam}&day=${day}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!Array.isArray(data.Quant)) throw new Error("Invalid question format");
    state.questions = data;
    initializeAnswers();
  } catch (err) {
    console.error(err);
    showError('❌ Failed to load questions: ' + err.message);
    throw err;
  }
}

// 🧠 Answer structure init
function initializeAnswers() {
  Object.keys(state.questions).forEach(section => {
    if (!state.answers[section])
      state.answers[section] = Array(state.questions[section].length).fill(null);
    if (!state.flags[section])
      state.flags[section] = Array(state.questions[section].length).fill(false);
  });
}

// 📂 Render section tabs
function renderSections() {
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

// ❓ Show one question
function renderQuestion() {
  const section = state.currentSection;
  const index = state.currentQuestionIndex;
  const qList = state.questions[section];

  if (!qList || !qList[index]) {
    showError("❌ Question data missing");
    return;
  }

  const q = qList[index];
  const selected = state.answers[section][index];

  // Render question number and text
  elements.questionNumber.textContent = `Question ${index + 1}`;
  elements.questionText.innerHTML = q.question;
  elements.options.innerHTML = '';

  // Render options
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = `w-full p-4 text-left rounded-lg mb-2 transition-all option-card 
      ${state.isReview ? 
        (idx === q.answerIndex ? 'correct border-2' : 
        (selected === idx ? 'wrong border-2' : 'bg-gray-50')) : 
        'bg-gray-50 hover:bg-blue-50 cursor-pointer'}
      ${selected === idx && !state.isReview ? 'border-blue-500 border-2' : ''}`;
    
    btn.textContent = opt;
    
    if (!state.isReview) {
      btn.onclick = () => selectAnswer(idx);
    }

    elements.options.appendChild(btn);
  });

  // Render passage if available
  if (q.passage) {
    elements.passage.classList.remove('hidden');
    if (Array.isArray(q.passage)) {
      elements.passage.innerHTML = q.passage.map(p => `<p>${p}</p>`).join('');
    } else {
      elements.passage.innerHTML = `<p>${q.passage}</p>`;
    }
  } else {
    elements.passage.innerHTML = '';
    elements.passage.classList.add('hidden');
  }

  // Render explanation in review mode
  if (state.isReview) {
    elements.explanation.innerHTML = `
      <div class="space-y-4">
        <div class="flex space-x-4 border-b mb-4">
          <button class="tab-btn py-2 px-4 ${
            q.videoUrl ? '' : 'hidden'
          }" data-tab="video">🎥 Video Solution</button>
          <button class="tab-btn py-2 px-4 border-b-2 border-blue-500 text-blue-500" data-tab="text">📖 Explanation</button>
        </div>
        <div id="text-explanation" class="tab-content">
          <p class="text-gray-700">${q.explanation || 'No explanation available.'}</p>
        </div>
        <div id="video-explanation" class="tab-content hidden"></div>
      </div>
    `;

    // Load video if available
    if (q.videoUrl) {
      const videoId = extractYouTubeId(q.videoUrl);
      const startTime = q.videoStart || 0;
      
      if (videoId) {
        document.getElementById('video-explanation').innerHTML = `
          <div class="aspect-video bg-gray-100 rounded-xl overflow-hidden">
            <iframe 
              class="w-full h-full"
              src="https://www.youtube.com/embed/${videoId}?start=${startTime}&rel=0"
              title="Video explanation"
              allowfullscreen>
            </iframe>
          </div>
        `;
      }
    }

    // Tab switching logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => 
          b.classList.remove('border-blue-500', 'text-blue-500'));
        btn.classList.add('border-blue-500', 'text-blue-500');

        document.querySelectorAll('.tab-content').forEach(c =>
          c.classList.add('hidden'));
        document.getElementById(`${btn.dataset.tab}-explanation`)
          .classList.remove('hidden');
      });
    });
  }
}

// 🎯 Select answer
function selectAnswer(index) {
  state.answers[state.currentSection][state.currentQuestionIndex] = index;
  renderQuestion();
  persistState();
}

// 🚩 Toggle mark
function toggleFlag() {
  const flags = state.flags[state.currentSection];
  flags[state.currentQuestionIndex] = !flags[state.currentQuestionIndex];
  renderQuestion();
  persistState();
}

// ⬅️➡️ Navigation
function navigate(dir) {
  const newIndex = state.currentQuestionIndex + dir;
  const section = state.questions[state.currentSection];
  if (newIndex >= 0 && newIndex < section.length) {
    state.currentQuestionIndex = newIndex;
    renderQuestion();
  }
  persistState();
}

// 🔐 Lock/unlock section switching
function handleSectionClick(e) {
  const section = e.target.dataset.section;
  if (!section) return;

  if (!state.isReview && section !== state.currentSection) {
    alert("Section locked! Wait for timer to switch automatically.");
    return;
  }

  changeSection(section);
}

function changeSection(section) {
  state.currentSection = section;
  state.currentQuestionIndex = 0;
  renderSections();
  renderQuestion();
}

// ⏲️ Timer setup
function startTestTimer() {
  if (state.isReview) return;

  const savedStart = localStorage.getItem("testStartTime");
  const now = Date.now();
  if (savedStart) {
    state.testStartTime = parseInt(savedStart);
  } else {
    state.testStartTime = now;
    localStorage.setItem("testStartTime", state.testStartTime);
  }

  state.timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.testStartTime) / 1000);
    const totalTestTime = 10*3; // 30 minutes
    const sectionDuration = 10*1; // minutes per section
    const sectionOrder = ["VARC", "LRDI", "Quants"];

    if (elapsed >= totalTestTime) {
      clearInterval(state.timerId);
      submitTest();
      return;
    }

    const sectionIndex = Math.floor(elapsed / sectionDuration);
    const nextSection = sectionOrder[sectionIndex];

    if (nextSection !== state.currentSection) {
      state.currentSection = nextSection;
      state.currentQuestionIndex = 0;
      renderSections();
      renderQuestion();
    }

    const remaining = sectionDuration - (elapsed % sectionDuration);
    updateTimerDisplay(remaining);
  }, 1000);
}

function updateTimerDisplay(remainingSeconds = 1800) {
  const m = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const s = String(remainingSeconds % 60).padStart(2, '0');
  elements.timer.textContent = `${m}:${s}`;
}

// ✅ Submit
async function submitTest() {
  if (state.isReview) return;

  try {
    const token = localStorage.getItem('token');
    const exam = localStorage.getItem('selectedExam');
    const day = localStorage.getItem('selectedDay') || 1;

    const res = await fetch(`${API_BASE}/api/mock/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        answers: state.answers,
        reviewFlags: state.flags,
        timeSpent: 90 * 60,
        exam,
        day
      })
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.message);

    localStorage.removeItem("testStartTime");
    localStorage.removeItem(`mockState_${exam}_Day${day}`);

    const attempts = JSON.parse(localStorage.getItem(`mockAttempts_${exam}`) || '{}');
    attempts[`mock${day}`] = 'completed';
    localStorage.setItem(`mockAttempts_${exam}`, JSON.stringify(attempts));

    state.isReview = true;
    elements.submitBtn.style.display = 'none';
    renderQuestion();
  } catch (err) {
    console.error("❌ Submission failed:", err);
    showError("❌ Submission failed.");
  }
}

// 🚫 Error handler
function showError(msg) {
  alert(msg);
}

// 📌 Event bindings
function setupEventListeners() {
  elements.prevBtn.addEventListener('click', () => navigate(-1));
  elements.nextBtn.addEventListener('click', () => navigate(1));
  elements.flagBtn.addEventListener('click', toggleFlag);
  elements.sections.addEventListener('click', handleSectionClick);
  elements.submitBtn.addEventListener('click', submitTest);
}

// 🚀 Init
async function init() {
  const exam = localStorage.getItem('selectedExam');
  const day = localStorage.getItem('selectedDay') || 1;

  const attempts = JSON.parse(localStorage.getItem(`mockAttempts_${exam}`) || '{}');
  state.isReview = attempts[`mock${day}`] === 'completed';

  // If in review mode, skip the modal
  if (state.isReview) {
    await initializeTest();
    return;
  }

  // Show instructions modal
  const modal = document.getElementById('instructions-modal');
  const startBtn = document.getElementById('start-test-btn');
  const countdownEl = document.getElementById('countdown');

  let countdown = 30;
  const countdownInterval = setInterval(() => {
    countdown--;
    countdownEl.textContent = countdown;
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      startBtn.disabled = false;
      startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      startBtn.classList.add('hover:bg-blue-600');
    }
  }, 1000);

  // Start test immediately if user clicks button
  startBtn.addEventListener('click', async () => {
    clearInterval(countdownInterval);
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
    await initializeTest();
  });

  // Load questions in background while showing modal
  try {
    const persisted = loadPersistedState();
    if (!persisted) {
      await loadQuestions(); // This happens while modal is visible
    }
  } catch (err) {
    showError("❌ Failed to load questions.");
    console.error(err);
  }
}

// New function to initialize test after modal
async function initializeTest() {
  initializeAnswers();
  setupEventListeners();
  renderSections();
  renderQuestion();
  updateTimerDisplay();

  if (!state.isReview) startTestTimer();
  else elements.submitBtn.style.display = 'none';
  
  // Update exam label if needed
  const examLabel = document.getElementById('exam-label');
  if (examLabel) {
    examLabel.textContent = localStorage.getItem('selectedExam') || 'CAT 2024';
  }
}

// Helper function
function extractYouTubeId(url) {
  const regex = /(?:youtube\.com.*[?&]v=|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function checkAlreadySubmitted(exam, day, token) {
  try {
    const res = await fetch(`${API_BASE}/api/mock`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!data.success) return;

    const match = data.mocks.find(m =>
      m.exam === exam && String(m.day) === String(day)
    );

    if (match) {
      alert("❌ You've already submitted this mock test. You can review it from the dashboard.");
      window.location.href = "/dashboard.html";
    }
  } catch (err) {
    console.error("❌ Failed to check submission status:", err);
    alert("Something went wrong. Try again later.");
    window.location.href = "/dashboard.html";
  }
}

// Fix for browser back/forward navigation
window.onpageshow = function (event) {
  if (event.persisted) {
    location.reload();
  }
};

document.addEventListener('DOMContentLoaded', init);