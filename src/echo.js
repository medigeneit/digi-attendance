// echo.js
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
Pusher.logToConsole = true // debug helpful

window.Pusher = Pusher

const API = import.meta.env.VITE_API_BASE_URL

const token = localStorage.getItem('auth_token') || ''

window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,         // => API server host
  wsPort: Number(import.meta.env.VITE_REVERB_PORT),
  wssPort: Number(import.meta.env.VITE_REVERB_PORT),
  forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: `${API}/api/broadcasting/auth`,     // <- API prefix ব্যবহার করেছি
  withCredentials: false,                           // Bearer flow
  auth: {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  },
})

// (ঐচ্ছিক) কানেকশন স্টেট দেখতে
const p = window.Echo.connector.pusher
p.connection.bind('state_change', s => console.log('[WS]', s.previous, '->', s.current))
p.connection.bind('error', e => console.error('[WS error]', e))
