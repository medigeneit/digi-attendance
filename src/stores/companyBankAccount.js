import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

export const useCompanyBankAccountStore = defineStore('companyBankAccount', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchCompanyBankAccounts = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/company-bank-accounts', { params })
      items.value = response.data || []
      return items.value
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to load company bank accounts.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createCompanyBankAccount = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/company-bank-accounts', data)
      const created = response.data
      items.value.unshift(created)
      return created
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create company bank account.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCompanyBankAccount = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/company-bank-accounts/${id}`, data)
      const updated = response.data
      const idx = items.value.findIndex((row) => String(row.id) === String(id))
      if (idx !== -1) items.value[idx] = updated
      return updated
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update company bank account.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteCompanyBankAccount = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/company-bank-accounts/${id}`)
      items.value = items.value.filter((row) => String(row.id) !== String(id))
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to delete company bank account.'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    items: computed(() => items.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchCompanyBankAccounts,
    createCompanyBankAccount,
    updateCompanyBankAccount,
    deleteCompanyBankAccount,
  }
})

