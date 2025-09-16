import { defineStore } from 'pinia'
import apiClient from '@/axios' // Ensure Axios is properly configured

export const useKpiReportStore = defineStore('kpi-report', {
  state: () => ({
    meta: null,
    rows: [],
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchBiMonthly(params) {
      this.isLoading = true
      this.error = null
      try {
        const { data } = await apiClient.get('/kpi/reports/bi-monthly', { params })
        this.meta = data?.meta ?? null
        this.rows = Array.isArray(data?.rows) ? data.rows : (Array.isArray(data?.data) ? data.data : [])
        return { meta: this.meta, rows: this.rows }
      } catch (e) {
        this.error = e?.response?.data?.message || 'Failed to load report'
        throw e
      } finally {
        this.isLoading = false
      }
    },

    async exportBiMonthly(params) {
      try {
        const res = await apiClient.get('/kpi/reports/bi-monthly/export', {
          params,
          responseType: 'blob',
        })

        const blob = res.data
        const cd = res.headers?.['content-disposition'] || ''
        const m = /filename\*?=(?:UTF-8''|")?([^;\r\n"]+)/i.exec(cd)
        const filename = m ? decodeURIComponent(m[1].replace(/"/g, '')) : `kpi-bimonthly-${params?.year || ''}.xlsx`

        return { blob, filename }
      } catch (e) {
        this.error = e?.response?.data?.message || 'Failed to export report'
        throw e
      }
    },
  },
})
