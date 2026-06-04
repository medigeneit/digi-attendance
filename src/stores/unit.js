import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

export const useUnitStore = defineStore('unit', () => {
  const units = ref([])
  const unit = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchUnits = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/units', { params })
      units.value = response.data || []
      return units.value
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to load units.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchUnit = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/units/${id}`)
      unit.value = response.data
      return unit.value
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to load unit.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createUnit = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/units', data)
      units.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create unit.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUnit = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/units/${id}`, data)
      const index = units.value.findIndex((item) => String(item.id) === String(id))
      if (index !== -1) units.value[index] = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update unit.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteUnit = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/units/${id}`)
      units.value = units.value.filter((item) => String(item.id) !== String(id))
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to delete unit.'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    units: computed(() => units.value),
    unit: computed(() => unit.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchUnits,
    fetchUnit,
    createUnit,
    updateUnit,
    deleteUnit,
  }
})
