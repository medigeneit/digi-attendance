import './assets/main.css';
import './assets/fontAwesome5Pro.css'

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

import App from './App.vue';
import router from './router';

const app = createApp(App);
const pinia = createPinia();


app.use(pinia);
app.use(router);

const authStore = useAuthStore(pinia);
  authStore.token = localStorage.getItem('auth_token');
  authStore.fetchUser();


app.mount('#app');
