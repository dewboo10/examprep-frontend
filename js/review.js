import { apiFetch } from './api.js';

document.addEventListener("DOMContentLoaded", async () => {
  const loader = document.getElementById("pageLoader");
  const mainContent = document.getElementById("main-content");
  const body = document.body;
  const params = new URLSearchParams(window.location.search);
  const exam = params.get("exam");
  const day = params.get("day");
  const token = localStorage.getItem("token");

  // Initialize loading state
const showLoader = () => {
  body.style.overflow = 'hidden';
  loader.style.display = 'flex';
  // Force reflow to ensure display:flex is applied before opacity transition
  void loader.offsetHeight;
  loader.style.opacity = '1';
  mainContent.classList.add('hidden');
};


const hideLoader = () => {
  loader.style.opacity = '0';
  
  setTimeout(() => {
    loader.style.display = 'none';
    mainContent.classList.remove('hidden');
    body.style.overflow = '';
    
    // Fade in the main content
    setTimeout(() => {
      body.style.opacity = '1';
    }, 50);
  }, 300); // Match this with the CSS transition duration
};
  // Start loading
  showLoader();

  if (!token || !exam || !day) {
    alert("Missing token, exam, or day!");
    hideLoader();
    return;
  }

  try {
    // 1. Get all questions
    const [questionRes, submissionRes] = await Promise.all([
      apiFetch(`/api/questions?exam=${exam}&day=${day}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      apiFetch(`/api/mock/review?exam=${exam}&day=${day}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    if (!questionRes.ok || !submissionRes.ok) {
      throw new Error('Failed to fetch data');
    }

    const [questionData, submissionData] = await Promise.all([
      questionRes.json(),
      submissionRes.json()
    ]);

    const questions = questionData.questions || questionData;
    const submission = submissionData.submission;

    if (!questions || !submission) {
      throw new Error('No review data found');
    }

    // 3. Group questions by section
    const sectionMap = questions;
    const userAnswers = submission.answers;
    const sections = Object.keys(sectionMap);
    let currentSection = sections[0];
    let currentIndex = 0;

    // Track correct/incorrect counts
    let correctCount = 0;
    let incorrectCount = 0;

    // Calculate initial stats
    sections.forEach(sec => {
      sectionMap[sec].forEach((q, idx) => {
        if (userAnswers[sec][idx] === q.answerIndex) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });
    });

    // Render section buttons
    const sectionBtns = document.getElementById("section-buttons");
    sections.forEach(sec => {
      const btn = document.createElement("button");
      btn.textContent = sec;
      btn.className = "px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition";
      btn.onclick = () => {
        console.log(`Switching to section: ${sec}, resetting currentIndex to 0`);
        currentSection = sec;
        currentIndex = 0;
        renderQuestion();
        renderNavigator();
        updateSectionHeader();
      };
      sectionBtns.appendChild(btn);
    });

    // Update current section header
    function updateSectionHeader() {
      document.getElementById("current-section").textContent = currentSection;
    }

    // Update stats display
    function updateStats() {
      document.getElementById("total-questions").textContent = 
        Object.values(sectionMap).reduce((acc, curr) => acc + curr.length, 0);
      document.getElementById("correct-count").textContent = correctCount;
      document.getElementById("incorrect-count").textContent = incorrectCount;
      
      const total = correctCount + incorrectCount;
      const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      document.getElementById("accuracy-rate").textContent = `${accuracy}%`;
    }

    function renderQuestion() {
  const qList = sectionMap[currentSection];
  const q = qList[currentIndex];
  const userAns = userAnswers[currentSection][currentIndex];
  const correctAns = q.answerIndex;
  const explanation = q.explanation || "No explanation available.";
  const videoUrl = q.videoUrl || "";
  const videoStart = q.videoStart || 0;
  const embedUrl = videoUrl ? videoUrl.replace("watch?v=", "embed/") + `?start=${videoStart}` : "";

  // Update question number
  console.log(`Rendering question: Section=${currentSection}, Index=${currentIndex}, Question Number=${currentIndex + 1}`);
  document.getElementById("question-number").textContent = currentIndex + 1;

  // Update explanation text
  document.getElementById("explanation-text").textContent = explanation;

  // Update video
  const videoFrame = document.getElementById("explanation-video");
  const noVideoMsg = document.getElementById("no-video-message");

  if (embedUrl) {
    videoFrame.src = embedUrl;
    videoFrame.classList.remove("hidden");
    noVideoMsg.classList.add("hidden");
  } else {
    videoFrame.classList.add("hidden");
    noVideoMsg.classList.remove("hidden");
  }

  // Render passage in separate box
  const passageBox = document.getElementById("passage-box");
  let passageHTML = '';
  if (q.passage && q.passage.length > 0) {
    if (Array.isArray(q.passage)) {
      passageHTML = q.passage.map(p => `<p class="mb-3 text-gray-700">${p}</p>`).join("");
    } else {
      passageHTML = `<p class="mb-3 text-gray-700">${q.passage}</p>`;
    }
  }
  passageBox.innerHTML = passageHTML || '<p class="text-gray-500 italic">No passage for this question</p>';

  // Render question in question box
  const questionBox = document.getElementById("question-box");
  questionBox.innerHTML = `<div class="text-lg font-medium text-gray-800">${q.question}</div>`;

  // Render options
  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = q.options.map((opt, idx) => {
    let base = "p-3 rounded-lg border-2 flex items-start";
    let icon = "";

    if (idx === correctAns) {
      base += " bg-green-50 border-green-400";
      icon = `<i class="fas fa-check-circle text-green-500 mr-3 mt-1"></i>`;
    } else if (idx === userAns) {
      base += " bg-red-50 border-red-400";
      icon = `<i class="fas fa-times-circle text-red-500 mr-3 mt-1"></i>`;
    } else {
      base += " border-gray-300";
      icon = `<span class="mr-3 w-6 h-6 flex items-center justify-center">${String.fromCharCode(65 + idx)}.</span>`;
    }

    return `
      <div class="${base}">
        ${icon}
        <span class="flex-1">${opt}</span>
      </div>
    `;
  }).join("");
}

    function renderNavigator() {
      const nav = document.getElementById("navigator");
      nav.innerHTML = "";
      
      sectionMap[currentSection].forEach((q, idx) => {
        const btn = document.createElement("button");
        btn.textContent = idx + 1;
        
        const userAns = userAnswers[currentSection][idx];
        const isCorrect = (userAns === q.answerIndex);
        
        btn.className = `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          idx === currentIndex 
            ? "ring-2 ring-blue-500 ring-offset-2 scale-110 bg-blue-500 text-white" 
            : isCorrect 
              ? "bg-green-100 text-green-800 border border-green-300" 
              : "bg-red-100 text-red-800 border border-red-300"
        }`;
        
        btn.onclick = () => {
          currentIndex = idx;
          renderQuestion();
          renderNavigator();
        };
        nav.appendChild(btn);
      });
    }

    document.getElementById("next-btn").onclick = () => {
      const qList = sectionMap[currentSection];
      if (currentIndex < qList.length - 1) {
        currentIndex++;
        console.log(`Next button: currentIndex now ${currentIndex}`);
        renderQuestion();
        renderNavigator();
      }
    };

    document.getElementById("prev-btn").onclick = () => {
      if (currentIndex > 0) {
        currentIndex--;
        console.log(`Prev button: currentIndex now ${currentIndex}`);
        renderQuestion();
        renderNavigator();
      }
    };

    // Initial renders
    updateSectionHeader();
    renderQuestion();
    renderNavigator();
    updateStats();
    
    hideLoader();
   
  } catch (err) {
    console.error("Review load error:", err);
    hideLoader();
    
    document.getElementById("question-box").innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700 font-medium">❌ ${err.message || "Failed to load review data. Please try again."}</p>
        ${err.message.includes('token') ? '<p class="mt-2 text-sm">You may need to <a href="/login.html" class="text-indigo-600 underline">log in again</a>.</p>' : ''}
      </div>
    `;
  }
});