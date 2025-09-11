import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/axios'

export const useUserMonthlyKpiStore = defineStore('userMonthlyKpi', () => {
  const list = ref([])
  const current = ref(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref(null)

  const msg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong'

  async function fetchList(params = {}) {
    isLoading.value = true; error.value = null
    try {
      const res = await api.get('/user-monthly-kpi', { params })
      list.value = res?.data?.data || []
    } catch (e) { error.value = msg(e); throw e } finally { isLoading.value = false }
  }

  async function create(user_id, monthly_kpi_form_id) {
    isSaving.value = true; error.value = null
    try {
      const res = await api.post('/user-monthly-kpi', { user_id, monthly_kpi_form_id })
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  async function show(id) {
    isLoading.value = true; error.value = null
    try {
      const res = await api.get(`/user-monthly-kpi/${id}`)
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isLoading.value = false }
  }

  async function updateTarget(id, monthly_target) {
    isSaving.value = true; error.value = null
    try {
      const res = await api.put(`/user-monthly-kpi/${id}`, { monthly_target })
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  async function finalize(id) {
    isSaving.value = true; error.value = null
    try {
      const res = await api.post(`/user-monthly-kpi/${id}/finalize`)
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  // rating a single item
  async function rateItem(itemId, role, score, comment='') {
    isSaving.value = true; error.value = null
    try {
      const res = await api.put(`/user-monthly-kpi-items/${itemId}/rate`, { role, score, comment })
      return res?.data?.data || res?.data
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  // observations per evaluation
  async function saveObservation(evaluationId, role, observation) {
    isSaving.value = true; error.value = null
    try {
      const res = await api.post(`/user-monthly-kpi/${evaluationId}/observations`, { role, observation })
      return res?.data?.data || res?.data
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  return { list, current, isLoading, isSaving, error, fetchList, create, show, updateTarget, finalize, rateItem, saveObservation }
})
