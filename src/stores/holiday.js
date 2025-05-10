import apiClient from '@/axios'; // Ensure Axios is properly configured
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHolidayStore = defineStore('holiday', () => {
  const holidays = ref([])
  const holiday = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Fetch all holidays or filter by year/date range
  async function fetchHolidays(params = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/holidays', { params })
      holidays.value = response?.data
      return response?.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch holidays'
    } finally {
      loading.value = false
    }
  }

  // Fetch a single holiday by ID
  async function fetchHolidayById(id) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/holidays/${id}`)
      holiday.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to fetch holiday with ID ${id}`
    } finally {
      loading.value = false
    }
  }

  // Create a new holiday
  async function createHoliday(payload) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/holidays', payload)
      holidays.value.push(response.data.data)
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create holiday'
    } finally {
      loading.value = false
    }
  }

  // Update an existing holiday
  async function updateHoliday(id, payload) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/holidays/${id}`, payload)
      const index = holidays.value.findIndex((h) => h.id === id)
      if (index !== -1) {
        holidays.value[index] = response.data.data
      }
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update holiday with ID ${id}`
    } finally {
      loading.value = false
    }
  }

  // Delete a holiday
  async function deleteHoliday(id) {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/holidays/${id}`)
      holidays.value = holidays.value.filter((h) => h.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to delete holiday with ID ${id}`
    } finally {
      loading.value = false
    }
  }

  return {
    holidays,
    holiday,
    loading,
    error,
    fetchHolidays,
    fetchHolidayById,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  }
})
