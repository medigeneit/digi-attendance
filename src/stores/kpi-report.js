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
        const res = await apiClient.get('/kpi/reports/bi-monthly-export', {
          params,
          responseType: 'blob',
        })

        // filename from header if present
        const dispo = res.headers['content-disposition'] || ''
        let filename = 'kpi_bi_monthly.xlsx'
        const match = /filename="?([^"]+)"?/i.exec(dispo)
        if (match && match[1]) filename = decodeURIComponent(match[1])

        const blob = new Blob(
          [res.data],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      } catch (e) {
        console.error(e)
        throw e
      }
    },

   async setReportCompletion(payload) {
      try {
        const { form_id, department_id, completed } = payload || {};
        if (!form_id) throw new Error('form_id is required');
        if (department_id === undefined || department_id === null) {
          throw new Error('department_id is required');
        }

        const { data } = await apiClient.patch(
          `/kpi/forms/${form_id}/report-completion`,
          { department_id, completed: !!completed }
        );

        return data;
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to update report completion';
        console.error('setReportCompletion error:', e);
        throw new Error(msg);
      }
    }

  },
})
