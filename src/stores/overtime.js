import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useOvertimeStore = defineStore('overtime', () => {
  const overtimes = ref([])
  const overtime = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const selectedMonth = ref(new Date().toISOString().substring(0, 7))

  const selectedMonthDisplay = computed(() => {
    const date = new Date(selectedMonth.value)
    return date.toLocaleString('default', { month: 'long', year: 'numeric' })
  })

  const fetchOvertimes = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/overtimes', { params: filters })
      overtimes.value = response?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch overtimes'
      console.error('Error fetching overtimes:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchUserOvertimes = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/user-overtimes', { params: filters })
      overtimes.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch overtimes'
      console.error('Error fetching overtimes:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchUserOvertimesByApplicationId = async (overtimeApplicationId) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/${overtimeApplicationId}/user-overtimes`)
      overtimes.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch overtimes'
      console.error('Error fetching overtimes:', err)
    } finally {
      loading.value = false
    }
  }

  const createOvertime = async (data = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/user-overtimes', data)
      overtimes.value.push(response.data.overtime)
      return response.data.overtime
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create overtime'
      console.error('Error creating overtime:', err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const updateOvertime = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/overtimes/${id}`, data)
      const index = overtimes.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        overtimes.value[index] = response.data.overtime
      }
      return response.data.overtime
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update overtime (ID: ${id})`
      console.error(`Error updating overtime with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const deleteOvertime = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/overtimes/${id}`)
      overtimes.value = overtimes.value.filter((attendance) => attendance.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to delete overtime (ID: ${id})`
      console.error(`Error deleting overtime with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  return {
    overtimes,
    overtime,
    loading,
    error,
    selectedMonth,
    selectedMonthDisplay,
    fetchOvertimes,
    createOvertime,
    updateOvertime,
    deleteOvertime,
    fetchUserOvertimes,
    fetchUserOvertimesByApplicationId,
  }
})
