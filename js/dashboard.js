// dashboard.js

import { getUserInfo } from './api.mjs';

const loader = document.querySelector('.loader');
const token = localStorage.getItem('token');

if (!token) {
  loader.innerHTML = 'Please log in to view dashboard.';
} else {
  getUserInfo(token)
    .then(user => {
      console.log("User fetched:", user);
      loader.style.display = 'none';
      // Proceed with showing dashboard
    })
    .catch(err => {
      console.error("Failed to load user:", err);
      loader.innerHTML = 'Session expired. Please log in again.';
    });
}