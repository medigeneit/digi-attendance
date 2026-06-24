import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

const msg = (err, fallback) => err?.response?.data?.message || fallback

export const usePfHistoricalBalanceStore = defineStore('pfHistoricalBalance', () => {
  const records = ref([])
  const meta = ref({ page: 1, per_page: 20, total: 0, last_page: 1 })
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)

  const statement = ref(null)
  const statementLoading = ref(false)
  const statementError = ref(null)

  async function fetchRecords(params = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get('/pf-historical-balances', { params: { page: 1, ...params } })
      const payload = res?.data?.data || {}
      records.value = payload.data || []
      meta.value = {
        page: payload.current_page || 1,
        per_page: payload.per_page || 20,
        total: payload.total || 0,
        last_page: payload.last_page || 1,
      }
    } catch (err) {
      records.value = []
      error.value = msg(err, 'Failed to load records.')
    } finally {
      loading.value = false
    }
  }

  async function createRecord(form) {
    saving.value = true
    error.value = null
    try {
      const res = await apiClient.post('/pf-historical-balances', form)
      return res?.data?.data
    } catch (err) {
      error.value = msg(err, 'Failed to create record.')
      throw err
    } finally {
      saving.value = false
    }
  }

  async function updateRecord(id, form) {
    saving.value = true
    error.value = null
    try {
      const res = await apiClient.put(`/pf-historical-balances/${id}`, form)
      return res?.data?.data
    } catch (err) {
      error.value = msg(err, 'Failed to update record.')
      throw err
    } finally {
      saving.value = false
    }
  }

  async function deleteRecord(id) {
    saving.value = true
    error.value = null
    try {
      await apiClient.delete(`/pf-historical-balances/${id}`)
    } catch (err) {
      error.value = msg(err, 'Failed to delete record.')
      throw err
    } finally {
      saving.value = false
    }
  }

  async function fetchStatement(userId, params = {}) {
    statementLoading.value = true
    statementError.value = null
    try {
      const res = await apiClient.get(`/pf-statement/${userId}`, { params })
      statement.value = res?.data?.data || null
    } catch (err) {
      statement.value = null
      statementError.value = msg(err, 'Failed to load PF statement.')
    } finally {
      statementLoading.value = false
    }
  }

  return {
    records, meta, loading, saving, error,
    statement, statementLoading, statementError,
    fetchRecords, createRecord, updateRecord, deleteRecord, fetchStatement,
  }
})
