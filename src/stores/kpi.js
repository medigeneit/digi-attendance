import { defineStore } from 'pinia'
import apiClient from '@/axios'

export const useKpiStore = defineStore('kpi', {

  state: () => ({ 
    cycle: null, 
    loading: false,
    users:[],
    error:null,
  }),

  actions: {
    async fetchActiveCycle() {
      try {
        this.loading = true
        const { data } = await apiClient.get('/kpi/active')
        this.cycle = data
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
