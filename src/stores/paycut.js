import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useNotificationStore } from './notification'

export const usePaycutStore = defineStore('paycut', () => {
  const paycuts = ref([])
  const paycut = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const selectedMonth = ref(new Date().toISOString().substring(0, 7))

  const selectedMonthDisplay = computed(() => {
    const date = new Date(selectedMonth.value)
    return date.toLocaleString('default', { month: 'long', year: 'numeric' })
  })

const fetchPaycuts = async (filters = {}) => {
  loading.value = true
  error.value = null
  try {
    const response = await apiClient.get('/paycuts', { params: filters })
    paycuts.value = response?.data?.data || response?.data || []
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to fetch paycuts'
    console.error('Error fetching paycuts:', err)
  } finally {
    loading.value = false
  }
}


  const fetchUserMonthlyPaycuts = async (userId, month) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/paycuts/${userId}/${month}`)      
      paycut.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch paycuts'
      console.error('Error fetching paycuts:', err)
    } finally {
      loading.value = false
    }
  }

  const createPaycut = async (data = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/paycuts', data)
      paycuts.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create paycut'
      console.error('Error creating paycut:', err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const fetchPaycutById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/paycuts/${id}`)
      paycut.value = response.data || {}

      const notificationStore = useNotificationStore()
      await notificationStore.fetchApprovalPermissions(
        'paycut_applications',
        paycut.value.id,
      )

      return paycut.value
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to fetch paycut (ID: ${id})`
      console.error(`Error fetching paycut with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const updatePaycut = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/paycuts/${id}`, data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update paycut (ID: ${id})`
      console.error(`Error updating paycut with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const deletePaycut = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/paycuts/${id}`)
      paycuts.value = paycuts.value.filter((p) => p.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to delete paycut (ID: ${id})`
      console.error(`Error deleting paycut with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const approvePaycut = async (id) => {
    try {
      await apiClient.post(`/paycuts/${id}/approve`)
      await fetchPaycutById(id)
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to approve paycut (ID: ${id})`
      console.error(err)
      throw new Error(error.value)
    }
  }

  const rejectPaycut = async (id) => {
    try {
      await apiClient.post(`/paycuts/${id}/reject`)
      await fetchPaycutById(id)
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to reject paycut (ID: ${id})`
      console.error(err)
      throw new Error(error.value)
    }
  }

  return {
    paycuts,
    paycut,
    loading,
    error,
    selectedMonth,
    selectedMonthDisplay,
    fetchPaycuts,
    fetchUserMonthlyPaycuts,
    fetchPaycutById,
    createPaycut,
    updatePaycut,
    deletePaycut,
    approvePaycut,
    rejectPaycut,
  }
})
