import { defineStore } from 'pinia'
import apiClient from '../axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    error: null,
  }),
  actions: {

    async register(name, phone, password) {
      try {
        const response = await apiClient.post('/register', { name, phone, password })
        this.user = response.data.user
        this.token = response.data.access_token
        localStorage.setItem('auth_token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        this.error = null
      } catch (error) {
        this.error = error.response.data.message
      }
    },
    async login(phone, password) {
      try {
        const response = await apiClient.post('/login', { phone, password })
        this.user = response.data.user
        this.token = response.data.token
        localStorage.setItem('auth_token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        this.error = null
      } catch (error) {
        this.error = error.response.data.message
      }
    },
    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
    },
    async checkPhone(phone) {
      try {
        const response = await apiClient.post('/check-phone', { phone })
        return response.data.isRegistered
      } catch (error) {
        this.error = error.response.data.message
        return false
      }
    },
    async fetchUser() {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          const response = await apiClient.get('/user', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          this.user = response.data
          this.token = token
        }
      } catch (error) {
        if(error?.response?.status === 401) {
          this.logout();
        }
        this.error = error.response.data.message
      }
    },

    async updateProfile(payload) {
      try {
        const token = this.token
        const response = await apiClient.put('/profile', payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        this.user = response.data.user
        localStorage.setItem('user', JSON.stringify(this.user))
        this.error = null
      } catch (error) {
        this.error = error.response.data.message
      }
    },

    async uploadProfilePhoto(formData) {
      try {
        const response = await apiClient.post('/upload-profile-photo', formData, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        this.user = response.data.user
        localStorage.setItem('user', JSON.stringify(this.user))
        this.error = null
      } catch (error) {
        this.error = error.response.data.message
      }
    },

    async changePassword(currentPassword, newPassword, newPasswordConfirmation) {
      try {
        const response = await apiClient.post('/change-password', {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: newPasswordConfirmation
        })
        this.error = null
        return response.data.message
      } catch (error) {
        this.error = error.response.data.message
      }
    },

    async fetchAttendance() {
      try {
        const response = await apiClient.get('/attendance/me', {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        })
        return response.data
      } catch (error) {
        if (error?.response?.status === 401) {
          this.logout(); 
        }
        this.error = error.response?.data?.message || 'Failed to fetch attendance';
        return null;
      }
    },

  },
})
