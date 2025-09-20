import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

export const useKpiAssignmentsStore = defineStore('kpiAssignments', () => {
  const items = ref([])
  const meta  = ref(null)            // optional: server meta
  const isLoading = ref(false)
  const isSaving  = ref(false)
  const error = ref(null)
  const lastQuery = ref({})          // শেষবার যে ফিল্টার গেছে

  const msg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong'

  // ---- helpers ----
  function buildParams(q = {}) {
    const raw = {
      company_id: q.company_id ? Number(q.company_id) : undefined,
      department_id: q.department_id ? Number(q.department_id) : undefined,
      line_type: q.line_type && q.line_type !== 'all' ? String(q.line_type) : undefined,
      // employee_id বা user_id যেটাই আসুক → user_id
      user_id: q.user_id ? Number(q.user_id)
            : (q.employee_id ? Number(q.employee_id) : undefined),
      per_page: q.per_page ? Number(q.per_page) : undefined,
      page: q.page ? Number(q.page) : undefined,
    }
    // undefined/''/null বাদ
    return Object.fromEntries(Object.entries(raw).filter(([,v]) => v !== undefined && v !== null && v !== ''))
  }

  let inflight // axios v1 AbortController
  async function fetchList(q = {}) {
    isLoading.value = true; error.value = null
    // আগের রিকোয়েস্ট ক্যান্সেল
    try { inflight?.abort?.() } catch {}
    inflight = new AbortController()

    try {
      const params = buildParams(q)
      lastQuery.value = { ...params } // save for refresh later

      const res = await apiClient.get('/assignments', {
        params,
        signal: inflight.signal,
      })
      const payload = res?.data
      items.value = payload?.data ?? payload ?? []
      meta.value  = payload?.meta ?? null
    } catch (e) {
      if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return
      error.value = msg(e); throw e
    } finally {
      isLoading.value = false
    }
  }

  async function create(payload) {
    isSaving.value = true; error.value = null
    try {
      const res = await apiClient.post('/assignments', payload)
      await fetchList(lastQuery.value) // একই ফিল্টারে রিফ্রেশ
      return res?.data
    } catch (e) { error.value = msg(e); throw e }
    finally { isSaving.value = false }
  }

  // 🔎 criteria search (org scope পাঠাতে পারো)
  async function fetchAvailableCriteria(q = '', org = {}) {
    const params = { q, ...buildParams(org) } // company/department/line_type থাকলে যাবে
    const res = await apiClient.get('/available-criteria', { params })
    return res?.data?.data || res?.data || []
  }

  async function close(id) {
    isSaving.value = true; error.value = null
    try {
      const res = await apiClient.post(`/assignments/${id}/close`)
      await fetchList(lastQuery.value)
      return res?.data
    } catch (e) { error.value = msg(e); throw e }
    finally { isSaving.value = false }
  }

  return { items, meta, isLoading, isSaving, error, fetchList, create, close, fetchAvailableCriteria }
})
