import { apiFetch } from './api.mjs';

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('custom-mock-form');
  const messageDiv = document.getElementById('form-message');
  const generateBtn = document.getElementById('generate-btn');
  const modeToggle = document.getElementById('mode-toggle');
  const modeLabel = document.getElementById('mode-label');
  const topicInput = document.getElementById('topic');
  const topicSelect = document.getElementById('topic-select');
  const topicHint = document.getElementById('topic-hint');

  // Initialize mode
  let useDatabase = false;
  loadAvailableFilters();

  // Mode toggle
  if (modeToggle) {
    modeToggle.addEventListener('change', function() {
      useDatabase = this.checked;
      if (modeLabel) {
        modeLabel.textContent = useDatabase ? 'Database Mode (from your 5000+ questions)' : 'AI Generation Mode';
      }
      
      // Switch between text input and select
      if (useDatabase) {
        topicInput.style.display = 'none';
        topicSelect.style.display = 'block';
        topicHint.textContent = 'Select a topic from your database';
        generateBtn.textContent = 'Load From Database';
      } else {
        topicInput.style.display = 'block';
        topicSelect.style.display = 'none';
        topicHint.textContent = 'Enter a custom topic for AI to generate questions';
        generateBtn.textContent = 'Generate Test';
      }
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    messageDiv.textContent = '';
    generateBtn.disabled = true;
    generateBtn.textContent = useDatabase ? 'Loading...' : 'Generating...';

    // Get topic from appropriate field
    const topic = useDatabase ? topicSelect.value : topicInput.value.trim();
    const difficulty = form.difficulty.value;
    const numberOfQuestions = parseInt(form.numQuestions.value, 10);
    const token = localStorage.getItem('token');

    if (!topic || !difficulty || !numberOfQuestions) {
      messageDiv.textContent = 'Please fill all fields.';
      generateBtn.disabled = false;
      generateBtn.textContent = useDatabase ? 'Load From Database' : 'Generate Test';
      return;
    }

    try {
      let result;
      
      if (useDatabase) {
        // Fetch from database
        result = await fetchFromDatabase(topic, difficulty, numberOfQuestions, token);
      } else {
        // AI Generate
        result = await generateWithAI(topic, difficulty, numberOfQuestions, token);
      }

      if (result.success && Array.isArray(result.questions) && result.questions.length > 0) {
        localStorage.setItem('customMockQuestions', JSON.stringify({
          questions: result.questions,
          topic,
          difficulty,
          numberOfQuestions: result.questions.length,
          source: useDatabase ? 'database' : 'ai',
          createdAt: Date.now()
        }));
        window.location.href = 'custom-quiz.html';
      } else {
        messageDiv.textContent = result.message || result.error || 'No questions found. Try different filters.';
      }
    } catch (err) {
      messageDiv.textContent = useDatabase 
        ? `Failed to load questions: ${err.message || 'Please try again.'}` 
        : `Failed to generate test: ${err.message || 'Please try again.'}`;
      console.error(err);
    }
    generateBtn.disabled = false;
    generateBtn.textContent = useDatabase ? 'Load From Database' : 'Generate Test';
  });

  // Fetch from database
  async function fetchFromDatabase(topic, difficulty, numberOfQuestions, token) {
    const res = await apiFetch('/api/mock/from-database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        topic,
        difficulty,
        numberOfQuestions
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error);
    }
    return { success: data.success, questions: data.questions };
  }

  // AI Generate
  async function generateWithAI(topic, difficulty, numberOfQuestions, token) {
    const res = await apiFetch('/api/mock/custom-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        topic,
        difficulty,
        numberOfQuestions
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    }
    return { success: data.success, questions: data.questions };
  }

  // Load available filters from database
  async function loadAvailableFilters() {
    try {
      const res = await apiFetch('/api/mock/filters');
      const data = await res.json();
      
      if (data.success && topicSelect) {
        const select = topicSelect;
        select.innerHTML = '<option value="">Select a topic...</option>';
        
        if (data.topics && data.topics.length > 0) {
          data.topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            select.appendChild(option);
          });
        }
      }
    } catch (err) {
      console.error("Failed to load topics:", err);
    }
  }
}); 