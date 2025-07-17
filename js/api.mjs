// API utility for consistent base URL usage

console.log('API MODULE LOADED');

export function getBaseUrl() {
    return window.VITE_BASE_URL || 'https://examprep-backend.onrender.com';
}

export function apiFetch(endpoint, options = {}) {
    const baseUrl = getBaseUrl();
    const url = baseUrl.replace(/\/$/, '') + endpoint;
    console.log('API FETCH:', url, options);
    return fetch(url, options);
}

export function getUserInfo(token) {
  return fetch(`${window.VITE_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(res => {
    if (!res.ok) throw new Error("Invalid token");
    return res.json();
  });
} 