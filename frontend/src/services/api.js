import axios from 'axios';

/**
 * Axios instance pre-configured with base URL.
 * The request interceptor automatically attaches the JWT
 * from localStorage to every outgoing request.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ── Request interceptor: attach JWT ────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cn_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local auth and redirect
      localStorage.removeItem('cn_token');
      localStorage.removeItem('cn_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth API ──────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/api/auth/signup', data),
  login:  (data) => api.post('/api/auth/login', data),
  getMe:  ()     => api.get('/api/auth/me'),
};

// ── Notes API ─────────────────────────────────────────────────────────
export const notesAPI = {
  getAll:         ()           => api.get('/api/notes'),
  getById:        (id)         => api.get(`/api/notes/${id}`),
  create:         (data)       => api.post('/api/notes', data),
  update:         (id, data)   => api.put(`/api/notes/${id}`, data),
  delete:         (id)         => api.delete(`/api/notes/${id}`),
  share:          (id, data)   => api.post(`/api/notes/${id}/share`, data),
  restoreVersion: (id, data)   => api.post(`/api/notes/${id}/restore`, data),
};

export default api;
