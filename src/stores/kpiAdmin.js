import { defineStore } from 'pinia'
import axios from '@/axios'

export const useKpiAdminStore = defineStore('kpiAdmin', {
  state: () => ({
   cycles: [],
    lanesConfig: null,
    overrides: [],
    loading: false,
    _userCache: new Map(),
    _abortCtrls: {},   
  }),
  actions: {
    async fetchCycles() {
      this.loading = true
      try {
        const { data } = await axios.get('/kpi/cycles')
        this.cycles = data
      } finally { this.loading = false }
    },
    async loadCycle(cycleId) {
      const { data } = await axios.get(`/kpi/cycles/${cycleId}`)
      this.lanesConfig = data.reviewer_lanes_json || []
      return data
    },
    async updateLanes(cycleId, lanes) {
      const { data } = await axios.put(`/kpi/cycles/${cycleId}/lanes`, {
        reviewer_lanes_json: lanes
      })
      this.lanesConfig = data.reviewer_lanes_json
      return data
    },
    async fetchOverrides(params) {
      const { data } = await axios.get('/kpi/overrides', { params })
      this.overrides = data
      return data
    },
    async saveOverridesBulk(payload) {
      return (await axios.post('/kpi/overrides/save-bulk', payload)).data
    },
    async lookupUsers(qOrParams) {

      const params = typeof qOrParams === 'string' ? { q: qOrParams } : (qOrParams || {})

      const key = JSON.stringify({ q: params.q || '', lane_key: params.lane_key })

      // Cache hit
      if (this._userCache.has(key)) return this._userCache.get(key)

      // Cancel previous identical key
      if (this._abortCtrls[key]) this._abortCtrls[key].abort()
      const ctrl = new AbortController()
      this._abortCtrls[key] = ctrl

      try {
        const { data } = await axios.get('/users', { params, signal: ctrl.signal })
        this._userCache.set(key, data)
        // TTL (optional): 60s পরে মুছে দিন
        setTimeout(() => this._userCache.delete(key), 60000)
        return data
      } catch (e) {
        if (e.name === 'CanceledError' || e.message?.includes('canceled')) return []
        throw e
      } finally {
        delete this._abortCtrls[key]
      }
    },
    async lookupDepartments(q) {
      const { data } = await axios.get('/departments', { params: { q } })
      return data
    }
  }
})
