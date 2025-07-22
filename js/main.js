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

if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener('backButton', function({ canGoBack }) {
    if (canGoBack) {
      window.history.back();
    } else {
      if (window.location.pathname.endsWith('dashboard.html')) {
        window.Capacitor.Plugins.App.exitApp();
      } else {
        window.location.href = 'dashboard.html';
      }
    }
  });
}
