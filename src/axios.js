import axios from 'axios';
import { useAuthStore } from './stores/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const csrfClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

let csrfTokenLoaded = false;
let csrfPromise = null;

const loadCsrfToken = () => {
  if (!csrfPromise) {
    csrfPromise = (async () => {
      while (!csrfTokenLoaded) {
        try {
          await csrfClient.get('/sanctum/csrf-cookie');
          csrfTokenLoaded = true;

          console.log('CSRF token loaded successfully.');
        } catch (error) {
          console.error("Failed to load CSRF cookie, retrying...", error);

          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    })();
  }
  return csrfPromise;
};

apiClient.interceptors.request.use(async (config) => {
  const authStore = useAuthStore();
  const token = authStore.token || localStorage.getItem('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log('API call initiated...');

  await loadCsrfToken();

  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 403) {
    console.log('403 Forbidden response received, redirecting to dashboard...');
    
    window.location = '/dashboard'; 
    return; 
  }
  return Promise.reject(error);
});

export default apiClient;
