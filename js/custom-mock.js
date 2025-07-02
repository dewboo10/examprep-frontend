document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('custom-mock-form');
  const messageDiv = document.getElementById('form-message');
  const generateBtn = document.getElementById('generate-btn');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    messageDiv.textContent = '';
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    const topic = form.topic.value.trim();
    const difficulty = form.difficulty.value;
    const numQuestions = parseInt(form.numQuestions.value, 10);
    const token = localStorage.getItem('token');

    if (!topic || !difficulty || !numQuestions) {
      messageDiv.textContent = 'Please fill all fields.';
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Test';
      return;
    }

    try {
      const res = await fetch('https://examprep-backend.onrender.com/api/mock/custom/custom-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          topic,
          difficulty,
          numQuestions
        })
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.questions) && result.questions.length > 0) {
        localStorage.setItem('customMockQuestions', JSON.stringify({
          questions: result.questions,
          topic,
          difficulty,
          numQuestions,
          createdAt: Date.now()
        }));
        window.location.href = 'custom-quiz.html';
      } else {
        messageDiv.textContent = result.message || 'No questions generated. Try a different topic or settings.';
      }
    } catch (err) {
      messageDiv.textContent = 'Failed to generate test. Please try again.';
    }
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Test';
  });
}); 