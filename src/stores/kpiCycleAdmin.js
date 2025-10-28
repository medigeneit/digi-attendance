import { defineStore } from 'pinia'
import axios from '@/axios'

export const useKpiCycleAdmin = defineStore('kpiCycleAdmin', {
  state: () => ({
    list: [],
    current: null,
    saving: false,
  }),
  actions: {
    async fetchAll() {
      this.list = (await axios.get('/admin/kpi/cycles')).data
    },
    async load(id) {
      this.current = (await axios.get(`/admin/kpi/cycles/${id}`)).data
      return this.current
    },
    async create(payload) {
      // {title, year, groups:[], lanes:[]}
      this.saving = true
      try {
        const { data } = await axios.post('/admin/kpi/cycles', payload)
        await this.fetchAll(); return data
      } finally { this.saving = false }
    },
    async update(id, payload) {
      this.saving = true
      try {
        const { data } = await axios.put(`/admin/kpi/cycles/${id}`, payload)
        this.current = data; await this.fetchAll(); return data
      } finally { this.saving = false }
    },
    async activate(id) {
      await axios.post(`/admin/kpi/cycles/${id}/activate`)
      await this.fetchAll()
    },
    async archive(id) {
      await axios.post(`/admin/kpi/cycles/${id}/archive`)
      await this.fetchAll()
    },
    async clone(id, year) {
      const { data } = await axios.post(`/admin/kpi/cycles/${id}/clone`, { year })
      await this.fetchAll(); return data
    },
    async remove(id) {
      await axios.delete(`/admin/kpi/cycles/${id}`)
      await this.fetchAll()
    }
  }
})
