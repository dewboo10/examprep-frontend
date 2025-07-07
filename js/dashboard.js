// dashboard.js

const API_BASE = 'https://examprep-backend.onrender.com';
const AUTH_API = `${API_BASE}/api/auth`;

const loader = document.getElementById("pageLoader");

function showLoader() {
  loader.style.display = "flex";
}

function hideLoader() {
  loader.style.display = "none";
}



window.onload = async () => {
  showLoader(); // ✅ Show loader immediately

  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const usernameEl = document.getElementById('username');
  const examLabel = document.getElementById('current-exam');

  if (username && usernameEl) {
    usernameEl.textContent = username;
  }

  const selectedExam = localStorage.getItem('selectedExam');
  if (selectedExam && examLabel) {
    examLabel.textContent = selectedExam;
  }

  const logoutBtn = document.querySelector('.fa-sign-out-alt')?.parentElement;
  if (logoutBtn) logoutBtn.style.display = token ? 'block' : 'none';

  if (token && token !== 'undefined' && token.length > 20) {
    document.getElementById('auth-modal')?.classList.add('hidden');
    const welcome = document.getElementById('username');
    if (welcome) welcome.textContent = username || 'User';

    // ✅ Only show dashboard after everything loads
    await fetchDashboardData();
    hideLoader(); // ✅ Hide loader only after all dashboard data has been fetched
  } else {
    hideLoader(); // Hide loader before showing login modal
    showLoginModal();
  }
};

// ✅ New wrapped loader-aware dashboard data fetch
async function fetchDashboardData() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.style.display = 'flex';

  try {
    await fetchQuizSummary();
    await fetchRecentQuizzes();
    await fetchMockList();
  } catch (err) {
    console.error('Error loading dashboard:', err);
  } finally {
  if (loader) loader.style.display = 'none';
  document.body.classList.remove("overflow-hidden"); // ✅ Allow scrolling after loading
}
}

function logout() {
  localStorage.clear();
  alert('You have been logged out');
  window.location.href = 'index.html';
}


function openOTPModal() {
  document.getElementById("otp-modal").classList.remove("hidden");
  document.getElementById("otp-step-title").textContent = "Step 1: Enter Email";
  document.getElementById("step-1").classList.remove("hidden");
  document.getElementById("step-2").classList.add("hidden");
  document.getElementById("step-3")?.classList.add("hidden");
  document.getElementById("otp-message").classList.add("hidden");
}

function sendOTP() {
  const email = document.getElementById("email-input").value.trim();
  if (!email) return alert("Please enter your email.");

  fetch(`${AUTH_API}/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        localStorage.setItem("tempEmail", email);
        document.getElementById("otp-step-title").textContent = "Step 2: Enter OTP";
        document.getElementById("step-1").classList.add("hidden");
        document.getElementById("step-2").classList.remove("hidden");
        document.getElementById("otp-message").textContent = data.message;
        document.getElementById("otp-message").classList.remove("hidden");
      } else {
        alert("Failed to send OTP");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Something went wrong.");
    });
}

async function verifyOTP() {
  const email = localStorage.getItem("tempEmail");
  const otp = document.getElementById("otp-input").value.trim();
  if (!otp) return alert("Please enter the OTP.");

  try {
    const res = await fetch(`${AUTH_API}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    const data = await res.json();
    if (res.ok) {
      alert("OTP verified!");
      document.getElementById("step-2").classList.add("hidden");
      document.getElementById("step-3").classList.remove("hidden");
    } else {
      alert(data.error || "Invalid OTP");
    }
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}

async function registerUser() {
  const name = document.getElementById('reg-name')?.value;
  const password = document.getElementById('reg-password')?.value;
  const email = localStorage.getItem('tempEmail');
console.log("Registering with:", { name, email, password }); // ✅ 

  if (!name || !email || !password) return alert("All fields are required");

  try {
    const res = await fetch(`${AUTH_API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.name);
      alert("Registration successful!");
      document.getElementById('auth-modal')?.classList.add('hidden');
      window.location.href = 'select-exam.html';
    } else {
      alert(data.error || "Registration failed");
    }
  } catch (err) {
    alert("Server error during registration");
  }
}

function showRegisterForm() {
  document.getElementById('login-form')?.classList.add('hidden');
  document.getElementById('auth-modal')?.classList.remove('hidden'); // Make sure auth modal is visible
  document.getElementById('otp-modal')?.classList.remove('hidden');  // ✅ Show the registration modal
  document.getElementById('step-1')?.classList.remove('hidden');      // Show email input
  document.getElementById('step-2')?.classList.add('hidden');
  document.getElementById('step-3')?.classList.add('hidden');
}

function logout() {
  localStorage.clear();
  alert('You have been logged out');
  window.location.href = 'index.html';
}

async function loginUser() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const res = await fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.user.name);
    alert("Login successful!");
    document.getElementById('auth-modal')?.classList.add('hidden');
    window.location.href = 'select-exam.html';
  } else {
    alert(data.error || 'Login failed');
  }
}

function displayQuizzes(quizzes, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  quizzes.forEach(quiz => {
    const title = quiz.title || `${quiz.exam || "Exam"} - Day ${quiz.day || "?"}`;
    const totalQuestions = quiz.noOfQuestions || quiz.totalQuestions || 0;

    const rawDate = quiz.submittedAt || quiz.createdAt;
    let formattedDate = 'Unknown';
    if (rawDate) {
      const dateObj = new Date(rawDate);
      formattedDate = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    const quizItem = document.createElement("div");
    quizItem.className = "p-4 bg-white rounded-lg shadow-sm border border-gray-100";

    quizItem.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-md font-semibold text-gray-800">${title}</h3>
          <p class="text-sm text-gray-500">Questions: ${totalQuestions}</p>
          <p class="text-xs text-gray-400">Submitted: ${formattedDate}</p>
        </div>
        <a href="review.html?exam=${quiz.exam}&day=${quiz.day}" class="text-sm text-blue-600 hover:underline">Review</a>
      </div>
    `;

    container.appendChild(quizItem);
  });
}

async function fetchQuizSummary() {
  try {
    const response = await fetch(`${API_BASE}/api/dashboard/quiz-summary`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const { completed, accuracy, streak, timeSpent } = await response.json();
    document.querySelector('[data-kpi="completed"]').textContent = completed;
    document.querySelector('[data-kpi="accuracy"]').textContent = `${accuracy}%`;
    document.querySelector('[data-kpi="streak"]').textContent = streak;
    document.querySelector('[data-kpi="timeSpent"]').textContent = `${(timeSpent / 3600).toFixed(2)} hrs`;
  } catch (err) {
    console.error('Error fetching quiz summary:', err);
  }
}

async function fetchRecentQuizzes() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/recent-quizzes`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    displayQuizzes(data, 'recent-quizzes');
  } catch (err) {
    console.error('Error fetching recent quizzes:', err);
  }
}

async function fetchMockList() {
  try {
    const res = await fetch(`${API_BASE}/api/mock`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    const data = await res.json();

    // ✅ Safely access the actual mocks array
    if (Array.isArray(data.mocks)) {
      displayQuizzes(data.mocks, 'mock-quizzes');
    } else {
      console.warn("Expected mocks array, got:", data);
    }

  } catch (err) {
    console.error('Error fetching mock list:', err);
  }
}
// Fix for browser back/forward navigation (to re-trigger fetch)
window.onpageshow = function (event) {
  if (event.persisted) {
    location.reload();
  }
};
// Sidebar toggle for mobile
// Ensures sidebar is hidden by default on mobile and only toggled by the menu button
// Sidebar is always visible on desktop (md:blo