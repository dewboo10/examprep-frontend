// API utility for consistent base URL usage

function getBaseUrl() {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BASE_URL) {
        return import.meta.env.VITE_BASE_URL;
    }
    if (typeof window !== 'undefined' && window.VITE_BASE_URL) {
        return window.VITE_BASE_URL;
    }
    // Fallback (should be set in index.html or .env loader)
    return 'https://examprep-backend.onrender.com';
}

/**
 * Wrapper for fetch that prepends the base URL.
 * @param {string} endpoint - The API endpoint (should start with /)
 * @param {object} options - Fetch options
 */
function apiFetch(endpoint, options = {}) {
    const baseUrl = getBaseUrl();
    // Avoid double slashes
    const url = baseUrl.replace(/\/$/, '') + endpoint;
    return fetch(url, options);
}

export { getBaseUrl, apiFetch }; 