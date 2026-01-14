import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import apiClient from '../axios'

export const useWeeklyUpdatesStore = defineStore('weeklyUpdates', () => {
  const loading = ref(false)
  const error = ref(null)
  const metaState = ref(null)
  const datesState = ref([])
  const rowsState = ref([])
  const params = reactive({
    anchor_date: '',
    past_days: 5,
    future_days: 5,
    window: null,
    start_date: '',
    end_date: '',
    company_id: '',
    department_id: '',
    line_type: '',
    user_id: '',
    status: '',
  })

  let activeController = null
  let requestId = 0

  const normalizeParams = (input) => {
    const cleaned = {}
    Object.entries(input || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      if (value === 'all') return
      cleaned[key] = value
    })
    return cleaned
  }

  const fetchWeekly = async (paramsOverride = {}) => {
    const currentRequest = ++requestId
    loading.value = true
    error.value = null

    Object.assign(params, paramsOverride)

    if (activeController) {
      activeController.abort()
    }
    activeController = new AbortController()

    try {
      const response = await apiClient.get('/weekly-updates', {
        params: normalizeParams(params),
        signal: activeController.signal,
      })
      if (currentRequest !== requestId) return
      metaState.value = response.data?.meta ?? null
      datesState.value = response.data?.dates ?? []
      rowsState.value = response.data?.rows ?? []
      return response.data
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return
      }
      if (currentRequest !== requestId) return
      error.value = err?.response?.data?.message || err?.message || 'Failed to load weekly updates.'
      throw err
    } finally {
      if (currentRequest === requestId) {
        loading.value = false
      }
    }
  }
  const sendWeeklyMessage = async (payload) => {
    const { kind, ref_id, status, message } = payload || {}
    if (!kind || !ref_id) throw new Error('Invalid item')

    const body = { kind, ref_id }
    if (status != null && status !== '') body.status = status
    if (message) body.message = message

    return await apiClient.post('/weekly-updates/send-message', body)
  }

  const prevWeek = () => fetchWeekly({ window: 'prev' })
  const nextWeek = () => fetchWeekly({ window: 'next' })
  const applyRange = (past_days, future_days) => fetchWeekly({ past_days, future_days, window: null })
  const setFilters = (filtersObj = {}) => fetchWeekly(filtersObj)

  const dates = computed(() => datesState.value)
  const rows = computed(() => rowsState.value)
  const meta = computed(() => metaState.value)

  return {
    loading,
    error,
    params,
    dates,
    rows,
    meta,
    fetchWeekly,
    prevWeek,
    nextWeek,
    applyRange,
    setFilters,
    sendWeeklyMessage,
  }
})
