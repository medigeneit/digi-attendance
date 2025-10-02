import './assets/main.css';
import './assets/fontAwesome5Pro.css'
import "vue-toastification/dist/index.css";

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { createHead } from '@vueuse/head'

import Toast from "vue-toastification";

import App from './App.vue';
import router from './router';

import './echo'

const app = createApp(App);
const pinia = createPinia();
const head = createHead()

app.use(pinia);
app.use(router);
app.use(head);

app.use(Toast, {
  position: "top-center",
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
});

const authStore = useAuthStore(pinia);
  authStore.token = localStorage.getItem('auth_token');
  authStore.fetchUser();


app.mount('#app');
