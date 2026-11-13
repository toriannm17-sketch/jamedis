import axios from 'axios';

// Backend base URL
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the mock JWT and user context to every request so the backend can audit-log them.
api.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(localStorage.getItem('jamedis_session') || 'null');
    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
      config.headers['x-user-id'] = session.user.id;
      config.headers['x-institution-id'] = session.user.institution_id;
    }
  } catch {
    /* ignore corrupt session data */
  }
  return config;
});

export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message ||
  (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Check that the backend is running on port 5000.' : fallback);

export default api;
