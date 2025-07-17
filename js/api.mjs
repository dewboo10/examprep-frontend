// API utility for consistent base URL usage

console.log('API MODULE LOADED');

export function getBaseUrl() {
    return window.VITE_BASE_URL || 'https://examprep-backend.onrender.com';
}

export function apiFetch(endpoint, options = {}) {
    let url = endpoint;
    if (!/^https?:\/\//.test(endpoint)) {
        const baseUrl = getBaseUrl();
        url = baseUrl.replace(/\/$/, '') + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
    }
    console.log('API FETCH:', url, options);
    return fetch(url, options);
} 