import { defineStore } from 'pinia'
import apiClient from '@/axios'

const pickNullableNumber = (...vals) => {
  for (const v of vals) {
    if (v === '' || v == null) continue
    if (Array.isArray(v)) {
      const nested = pickNullableNumber(...v)
      if (nested != null) return nested
      continue
    }
    if (typeof v === 'object') {
      const keys = [
        'score',
        'marks',
        'mark',
        'value',
        'obtained',
        'obtained_total',
        'total_mark',
        'total',
        'sum',
        'final',
        'avg',
      ]
      const nested = pickNullableNumber(...keys.map((k) => v?.[k]))
      if (nested != null) return nested
      continue
    }
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

const sumObjectNumbers = (obj, { excludeKeys = [] } = {}) => {
  if (!obj || typeof obj !== 'object') return null
  const exclude = new Set(excludeKeys.map((k) => String(k)))
  let sum = 0
  let hasAny = false
  Object.keys(obj).forEach((k) => {
    if (exclude.has(String(k))) return
    const n = pickNullableNumber(obj[k])
    if (n == null) return
    sum += n
    hasAny = true
  })
  return hasAny ? sum : null
}

export const useKpiStore = defineStore('kpi', {

  state: () => ({ 
    cycle: null, 
    loading: false,
    users:[],
    strengths:null,
    gaps:null,
    error:null,
    training: null,
    discipline: null,
    training_breakdown: null,
    discipline_breakdown: null,
    auto_for_employee_id: null,
  }),

  actions: {
     resetAutoScores() {
        this.training = null
        this.discipline = null
        this.training_breakdown = null
        this.discipline_breakdown = null
        this.auto_for_employee_id = null
      },
      
    async fetchActiveCycle(employeeId) {
      try {
        this.loading = true
        const { data } = await apiClient.get(`/kpi/active/${employeeId}`)
        this.cycle = data?.cycle

        const trainingObj = data?.training
        const disciplineObj = data?.discipline_marks
        this.training_breakdown = trainingObj && typeof trainingObj === 'object' ? trainingObj : null
        this.discipline_breakdown = disciplineObj && typeof disciplineObj === 'object' ? disciplineObj : null

        const t = pickNullableNumber(
          trainingObj?.total_mark,
          trainingObj?.total,
          sumObjectNumbers(trainingObj, { excludeKeys: ['total_mark', 'total'] }),
          data?.training_marks,
          data?.training_mark,
          data?.training_score,
        )
        const d = pickNullableNumber(
          // discipline_marks object often holds per-item marks + a "discipline" item
          disciplineObj?.total_mark,
          disciplineObj?.total,
          sumObjectNumbers(disciplineObj, { excludeKeys: ['total_mark', 'total'] }),
          data?.discipline_marks,
          data?.discipline_mark,
          data?.discipline_score,
          data?.discipline,
        )

        this.training = t
        this.discipline = d
        this.auto_for_employee_id = employeeId ?? null
        this.strengths = data?.comments?.strengths ?? null
        this.gaps = data?.comments?.gaps ?? null
        
      } finally { this.loading = false }
    },

    async  fetchUsers( params = {}) {
      try {

        this.loading = true // লোডিং শুরু
        const response = await apiClient.get(`/yearly-kpi-users`, {params})

        this.users = response.data
        this.error = null
        
      } catch (err) {
        this.error = err.response?.data?.message || 'Something went wrong'
      } finally {
        this.loading = false // লোডিং শেষ
    }
  },

    async submitReview(payload) {
      const { data } = await apiClient.post('/kpi/review/submit', payload)
      return data
    },

    async fetchSummary(cycleId, employeeId) {
      const { data } = await apiClient.get(`/kpi/summary/${cycleId}/${employeeId}`)
      return data
    },

    async submitFinalResult(cycleId, employeeId) {
      const { data } = await apiClient.post(`/kpi/finalize/${cycleId}/${employeeId}`)
      return data
    },

    async fetchLanes(cycleId, employeeId) {
        const { data } = await apiClient.get(`/kpi/lanes/${cycleId}/${employeeId}`)
        return data 
    }
  }

})
