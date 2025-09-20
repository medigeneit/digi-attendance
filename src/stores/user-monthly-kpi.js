import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios';

export const useUserMonthlyKpiStore = defineStore('userMonthlyKpi', () => {
  const list = ref([])
  const current = ref({
    items: [],
    observations: [],
    monthly_target: '',
    target: { max_score: 0, incharge_score: 0, coordinator_score: 0, final_score: 0 },
  })
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref(null)

  const msg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong'

  async function fetchList(params = {}) {
    isLoading.value = true; error.value = null
    try {
      const res = await apiClient.get('/user-monthly-kpi', { params })
      list.value = res?.data?.data || []
    } catch (e) { error.value = msg(e); throw e } finally { isLoading.value = false }
  }

  async function create(user_id, monthly_kpi_form_id) {
    isSaving.value = true; error.value = null
    try {
      const res = await apiClient.post('/user-monthly-kpi', { user_id, monthly_kpi_form_id })
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  async function show(id) {
    isLoading.value = true; 
    error.value = null
    try {
      console.log({id});
      
      const res = await apiClient.get(`/user-monthly-kpi/${id}`)
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isLoading.value = false }
  }

  async function updateTarget(id, monthly_target) {
    isSaving.value = true; error.value = null
    try {
      const res = await apiClient.put(`/user-monthly-kpi/${id}`, { monthly_target })
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  async function finalize(id) {
    isSaving.value = true; error.value = null
    try {
      const res = await apiClient.post(`/user-monthly-kpi/${id}/finalize`)
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  // rating a single item
    async function rateScore(id, kind, role, score, comment = '') {
    isSaving.value = true
    try {
      const { data } = await apiClient.post(`/evaluations/${id}/scores/${kind}/rate`, {
        role, score, comment
      })
      return data
    } finally {
      isSaving.value = false
    }
  }

  // observations per evaluation
  async function saveObservation(evaluationId, role, observation) {
    isSaving.value = true; error.value = null
    try {
      const res = await apiClient.post(`/user-monthly-kpi/${evaluationId}/observations`, { role, observation })
      return res?.data?.data || res?.data
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  async function rateTarget(id, role, score, comment='') {
    isSaving.value = true; error.value = null
    try {
      const res = await apiClient.put(`/user-monthly-kpi/${id}/target/rate`, { role, score, comment })
      current.value = res?.data?.data || res?.data
      return current.value
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  return { list, current, isLoading, isSaving, error, fetchList, create, show, updateTarget, finalize, rateScore, saveObservation, rateTarget  }
})
