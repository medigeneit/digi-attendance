import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(null);
  const error = ref(null);

  const isAuthenticated = computed(() => !!token.value);

  // ✅ Admin Mode state
  const adminMode = ref(localStorage.getItem('admin_mode') === 'true')

   function toggleAdminMode() {
    adminMode.value = !adminMode.value
    localStorage.setItem('admin_mode', adminMode.value)
  }

  function setAdminMode(value) {
    adminMode.value = value
    localStorage.setItem('admin_mode', value)
  }

  async function register(name, phone, password) {
    try {
      const response = await apiClient.post('/register', { name, phone, password });
      user.value = response.data.user;
      token.value = response.data.access_token;
      localStorage.setItem('auth_token', token.value);
      localStorage.setItem('user', JSON.stringify(user.value));
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Registration failed.';
    }
  }

  async function login(email, password) {
    try {
      const response = await apiClient.post('/login', { email, password });
      user.value = response.data.user;
      token.value = response.data.token;
      localStorage.setItem('auth_token', token.value);
      localStorage.setItem('user', JSON.stringify(user.value));
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Login failed.';
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  async function checkPhone(phone) {
    try {
      const response = await apiClient.post('/check-phone', { phone });
      return response.data.isRegistered;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to check phone.';
      return false;
    }
  }

  async function fetchUser() {
    try {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        const response = await apiClient.get('/user', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        user.value = response.data;
        token.value = storedToken;
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        logout();
      }
      error.value = err.response?.data?.message || 'Failed to fetch user.';
    }
  }

  async function updateProfile(payload) {
    try {
      const response = await apiClient.put('/profile', payload, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });
      user.value = response.data.user;
      localStorage.setItem('user', JSON.stringify(user.value));
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update profile.';
    }
  }

  async function uploadProfilePhoto(formData) {
    try {
      const response = await apiClient.post('/upload-profile-photo', formData, {
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      user.value = response.data.user;
      localStorage.setItem('user', JSON.stringify(user.value));
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to upload profile photo.';
    }
  }

  async function changePassword(payload) {
    try {
      const response = await apiClient.post('/change-password', {
        current_password: payload?.old_password,
        new_password: payload?.new_password,
        new_password_confirmation: payload?.confirm_password,
      });
      error.value = null;
      return response.data.message;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to change password.';
    }
  }

  async function fetchAttendance() {
    try {
      const response = await apiClient.get('/attendance/me', {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });
      return response.data;
    } catch (err) {
      if (err?.response?.status === 401) {
        logout();
      }
      error.value = err.response?.data?.message || 'Failed to fetch attendance.';
      return null;
    }
  }

  return {
    user,
    token,
    error,
    isAuthenticated,
    adminMode, // ✅ exposed state
    toggleAdminMode, // ✅ exposed action
    setAdminMode,
    register,
    login,
    logout,
    checkPhone,
    fetchUser,
    updateProfile,
    uploadProfilePhoto,
    changePassword,
    fetchAttendance,
  };
});
