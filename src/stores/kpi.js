import { defineStore } from 'pinia'
import axios from '@/axios'

export const useKpiStore = defineStore('kpi', {

  state: () => ({ cycle: null, loading: false }),

  actions: {
    async fetchActiveCycle() {
      try {
        this.loading = true
        const { data } = await axios.get('/kpi/active')
        this.cycle = data
      } finally { this.loading = false }
    },

    async submitReview(payload) {
      const { data } = await axios.post('/kpi/review/submit', payload)
      return data
    },

    async fetchSummary(cycleId, employeeId) {
      const { data } = await axios.get(`/kpi/summary/${cycleId}/${employeeId}`)
      return data
    },

    async submitFinalResult(cycleId, employeeId) {
      const { data } = await axios.post(`/kpi/finalize/${cycleId}/${employeeId}`)
      return data
    },

    async fetchLanes(cycleId, employeeId) {
        const { data } = await axios.get(`/kpi/lanes/${cycleId}/${employeeId}`)
        return data 
    }
  }

})
