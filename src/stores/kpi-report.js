import { defineStore } from 'pinia'
import apiClient from '@/axios' // Ensure Axios is properly configured

export const useKpiReportStore = defineStore('kpi-report', {
  state: () => ({
    meta: null,
    rows: [],
    reports: null,
    isLoading: false,
    error: null,
    marking: {
    isLoading: false,
    error: null,
    lanes: [],
    reviewsByLane: {},
    personalItems: [],
    personalMaxTotal: 0,
    employee: null,
    annualTargetAvg: null,
    annualPerformanceAvg: null,
    lastKey: null, // cache key
    marking: {
      isLoading: false,
      error: null,
      lanes: [],
      reviewsByLane: {},
      personalItems: [],
      personalMaxTotal: 0,
      employee: null,
      lastKey: null,
    },

  },
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
    },

    async setTargetCompletion({ form_id, department_id, completed }) {
      const { data } = await apiClient.post(
        `/kpi/bi-monthly/forms/${form_id}/target-completion`,
        { department_id, completed }
      )
      return data
    },

    async fetchYearly(params) {
      this.isLoading = true
      this.error = null
      try {
        const { data } = await apiClient.get('/kpi/reports/yearly', { params })
         this.meta = data?.meta ?? null
        this.rows = Array.isArray(data?.rows) ? data.rows : []
        this.reports = data ?? null
      return { meta: this.meta, rows: this.rows }
    } catch (e) {
      this.error = e?.response?.data?.message || 'Failed to load yearly report'
      throw e
    } finally {
      this.isLoading = false
    }
  },

    async exportYearly(params) {
      try {
        const res = await apiClient.get('/yearly-kpi-summary-reports', {
          params,
          responseType: 'blob',
        })

        const dispo = res.headers['content-disposition'] || ''
        let filename = 'yearly_kpi_report.xlsx'
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

    async fetchYearlyExecutive(params) {
      this.isLoading = true
      this.error = null
      try {
        const { data } = await apiClient.get('/yearly-kpi-summary-reports', { params })
        this.meta = data?.meta ?? null
        this.rows = Array.isArray(data?.rows) ? data.rows : []
        this.reports = data ?? null
        return { meta: this.meta, rows: this.rows, reports: this.reports }
      } catch (e) {
        this.error = e?.response?.data?.message || 'Failed to load yearly report'
        throw e
      } finally {
        this.isLoading = false
      }
    },

    async fetchMarkingForm({ cycle_id, employee_id, lane_keys = 'supv_director,da', include_personal_items = 1, force = false }) {
        const key = `${cycle_id}|${employee_id}|${lane_keys}|${include_personal_items}`
        if (!force && this.marking.lastKey === key && this.marking.lanes?.length) return this.marking

        this.marking.isLoading = true
        this.marking.error = null
        try {
          const { data } = await apiClient.get(`/kpi/lanes/${cycle_id}/${employee_id}`, {
            params: { lane_keys, include_personal_items },
          })
          

          this.marking.lanes = data?.lanes || []
          this.marking.reviewsByLane = data?.reviews_by_lane || {}
          this.marking.personalItems = data?.personal_items || []
          this.marking.personalMaxTotal = Number(data?.personal_max_total || 0)
          this.marking.employee = data?.employee ?? null

          this.marking.lastKey = key
          return this.marking
        } catch (e) {
          const msg = e?.response?.data?.message || e?.message || 'Failed to load marking form'
          this.marking.error = msg
          throw new Error(msg)
        } finally {
          this.marking.isLoading = false
      }
    },

    async submitOverallMark({
      cycle_id,
      employee_id,
      reviewer_lane,
      overall_mark,
      group_key = 'personal',
      strengths = null,
      gaps = null,
      suggestions = null,
    }) {
      try {
        const payload = {
          cycle_id,
          employee_id,
          reviewer_lane,
          group_key,
          overall_mark: Number(overall_mark), // ✅ ensure number
          strengths,
          gaps,
          suggestions,
        }

        const { data } = await apiClient.post('/kpi/review/overall-submit', payload)
        return data
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to submit overall mark'
        throw new Error(msg)
      }
    }

  },
})
