import { apiFetch } from './api.mjs';

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) return alert("❌ You must be logged in");

  try {
    const res = await apiFetch('/api/performance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const result = await res.json();
    if (!result.success || !result.data) {
      throw new Error("No data returned");
    }

    const data = result.data;

    // Set basic KPIs
    setText('totalQuizzes', data.totalQuizzes);
    setText('totalScore', data.totalScore);
    setText('totalTime', formatTime((data.totalTime || 0) * 60)); // convert mins to secs
    setText('avgAccuracy', data.avgAccuracy ? data.avgAccuracy.toFixed(2) + '%' : '0%');
    setText('predictedPercentile', data.percentile || '0');

    // Best & Least Sections
    const sections = data.sectionScores || {};
    const entries = Object.entries(sections).map(([name, score]) => ({ name, score }));
    if (entries.length > 0) {
      const sorted = [...entries].sort((a, b) => b.score - a.score);
      setText('bestSection', sorted[0].name || '—');
      setText('bestSectionAvg', sorted[0].score.toFixed(2));
      setText('leastSection', sorted.at(-1).name || '—');
      setText('leastSectionAvg', sorted.at(-1).score.toFixed(2));
    }

    // Render Chart
    if (window.Chart && document.getElementById('sectionChart')) {
      const ctx = document.getElementById('sectionChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(sections),
          datasets: [{
            label: 'Total Score per Section',
            data: Object.values(sections),
            backgroundColor: ['#4ADE80', '#60A5FA', '#FBBF24', '#F87171'],
            borderColor: ['#16A34A', '#2563EB', '#F59E0B', '#DC2626'],
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Render recent attempts
    const recent = data.recent || [];
    const tbody = document.getElementById('recentAttemptsTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      recent.forEach(attempt => {
        const row = tbody.insertRow();
        row.insertCell().innerText = attempt.test || 'Unknown';
        row.insertCell().innerText = attempt.totalScore || 0;
        row.insertCell().innerText = formatTime((attempt.timeSpent || 0) * 60);
        row.insertCell().innerText = attempt.date
          ? new Date(attempt.date).toLocaleDateString()
          : 'N/A';
      });
    }

  } catch (err) {
    console.error('Error fetching performance data:', err);
    alert("❌ Failed to load performance data");
  }
});

// Utility
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Format seconds to HH:MM:SS
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs}h ${mins}m ${secs}s`;
}
