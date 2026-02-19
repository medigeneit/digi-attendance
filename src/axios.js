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

const PUBLIC_PATH_PATTERNS = [
  /^\/$/,
  /^\/home$/,
  /^\/login$/,
  /^\/register$/,
  /^\/about$/,
  /^\/privacy-policy$/,
  /^\/careers$/,
  /^\/careers\/jobs\/[^/]+$/,
  /^\/contact$/,
  /^\/404$/,
];

const isPublicPath = (path = '') => PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(path));

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

  config.headers['X-Socket-Id'] = window.Echo.socketId() || '',   // <— গুরুত্বপূর্ণ

  console.log(`${config.method.toUpperCase()} ${config.url} - API call initiated...`);

  await loadCsrfToken();

  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use((response) => {
  console.log(`${response.config.method.toUpperCase()} ${response.config.url} - Api Call SUCCESS`);
  return response;
}, (error) => {
  if (error.response && error.response.status === 403) {
    const currentPath = window.location?.pathname || '';
    const allowPublicStay = isPublicPath(currentPath);
    console.log('403 Forbidden response received.');

    if (!allowPublicStay) {
      console.log('Redirecting to dashboard...');
      window.location = '/dashboard';
    }
    return Promise.reject(error);
  }

  if (error.response && error.response.status === 401) {
    console.log('401 Unauthorized response received, redirecting to login...');
    
    const authStore = useAuthStore();
    authStore.logout(); // Clear the token from the store
    window.location = '/login';
    return Promise.reject(error);
  }

  return Promise.reject(error);
});

export default apiClient;
