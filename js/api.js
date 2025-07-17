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