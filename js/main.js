function logout() {
    // Clear all locally stored user data
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('selectedExam');
    localStorage.removeItem('mockAttempts');
    localStorage.removeItem('userId');
    localStorage.clear(); // optional full wipe

    // Redirect to login page
    window.location.href = 'login.html'; // or index.html
  
 }

document.addEventListener('DOMContentLoaded', function() {
  const username = localStorage.getItem('username');
  const usernameEl = document.getElementById('username');
  if (username && usernameEl) {
    usernameEl.textContent = username;
  }
});
