import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const error = ref(null)
  const featurePermissions = ref({})
  const featurePermissionsLoaded = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdminMood = ref(localStorage.getItem('admin_mode') === 'true')

  function toggleAdminMode() {
    isAdminMood.value = !isAdminMood.value
    localStorage.setItem('admin_mode', isAdminMood.value)
  }

  function setAdminMode(value) {
    isAdminMood.value = value
    localStorage.setItem('admin_mode', value)
  }

  async function register(name, phone, password) {
    try {
      const response = await apiClient.post('/register', { name, phone, password, client_type: 'web' })
      user.value = response.data.user
      token.value = response.data.access_token
      localStorage.setItem('auth_token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))
      await fetchFeaturePermissions(true)
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Registration failed.'
    }
  }

  async function login(email, password) {
    try {
      const response = await apiClient.post('/login', { email, password, client_type: 'web' })
      user.value = response.data.user
      token.value = response.data.token
      localStorage.setItem('auth_token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))
      await fetchFeaturePermissions(true)
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Login failed.'
    }
  }

  function logout() {
    user.value = null
    token.value = null
    featurePermissions.value = {}
    featurePermissionsLoaded.value = false
    isAdminMood.value = false
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    localStorage.removeItem('admin_mode')
    localStorage.removeItem('next')
  }

  async function checkPhone(phone) {
    try {
      const response = await apiClient.post('/check-phone', { phone })
      return response.data.isRegistered
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to check phone.'
      return false
    }
  }

  async function fetchUser() {
    try {
      const storedToken = localStorage.getItem('auth_token')
      if (storedToken) {
        const response = await apiClient.get('/user', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        user.value = response.data
        token.value = storedToken
        await fetchFeaturePermissions()
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        logout()
      }
      error.value = err.response?.data?.message || 'Failed to fetch user.'
    }
  }

  async function fetchFeaturePermissions(force = false) {
    if (featurePermissionsLoaded.value && !force) return featurePermissions.value

    const storedToken = token.value || localStorage.getItem('auth_token')
    if (!storedToken) return {}

    try {
      const response = await apiClient.get('/me/feature-permissions', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })
      featurePermissions.value = response.data?.data?.effective || {}
      featurePermissionsLoaded.value = true
      return featurePermissions.value
    } catch (err) {
      if (err?.response?.status === 401) {
        logout()
      }
      error.value = err.response?.data?.message || 'Failed to fetch feature permissions.'
      return featurePermissions.value
    }
  }

  function canFeature(permissionKey) {
    if (!permissionKey) return true
    const currentUser = user.value || storedUser()
    if (['super_admin', 'developer'].includes(currentUser?.role)) return true
    if (!featurePermissionsLoaded.value) return true
    return featurePermissions.value[permissionKey] !== false
  }

  async function updateProfile(payload) {
    try {
      const response = await apiClient.put('/profile', payload, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
      user.value = response.data.user
      localStorage.setItem('user', JSON.stringify(user.value))
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update profile.'
    }
  }

  async function uploadProfilePhoto(formData) {
    try {
      const response = await apiClient.post('/upload-profile-photo', formData, {
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      user.value = response.data.user
      localStorage.setItem('user', JSON.stringify(user.value))
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to upload profile photo.'
    }
  }

  async function changePassword(payload) {
    try {
      const response = await apiClient.post('/change-password', {
        current_password: payload?.old_password,
        new_password: payload?.new_password,
        new_password_confirmation: payload?.confirm_password,
      })
      error.value = null
      return response.data.message
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to change password.'
    }
  }

  async function fetchAttendance() {
    try {
      const response = await apiClient.get('/attendance/me', {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
      return response.data
    } catch (err) {
      if (err?.response?.status === 401) {
        logout()
      }
      error.value = err.response?.data?.message || 'Failed to fetch attendance.'
      return null
    }
  }

  return {
    user,
    token,
    error,
    isAuthenticated,
    isAdminMood,
    featurePermissions,
    featurePermissionsLoaded,
    toggleAdminMode,
    setAdminMode,
    register,
    login,
    logout,
    checkPhone,
    fetchUser,
    fetchFeaturePermissions,
    canFeature,
    updateProfile,
    uploadProfilePhoto,
    changePassword,
    fetchAttendance,
  }
})
