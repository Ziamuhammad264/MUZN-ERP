import axios from 'axios';

// Base URL comes from the Vite env (VITE_API_URL) and falls back to production.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.muzndelivery.com/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// --- Response helpers -------------------------------------------------------
// The API wraps every payload as { success, message, data }. `unwrap` returns
// the inner `data`; `message` extracts a human-readable error message.

export const unwrap = (response) => {
  const body = response?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
};

export const apiMessage = (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data;
  // Prefer the first field-level validation error (422) — the top-level message
  // is usually generic ("The given data was invalid"), so surface the specifics.
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0];
    if (first) return Array.isArray(first) ? first[0] : String(first);
  }
  return data?.message || error?.message || fallback;
};

export const apiErrors = (error) => error?.response?.data?.errors || null;
