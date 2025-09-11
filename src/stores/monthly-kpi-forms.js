import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../axios'

export const useMonthlyKpiFormsStore = defineStore('monthlyKpiForms', () => {
  // state
  const items = ref([])
  const current = ref(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref(null)

  const meta = ref({ total: 0, per_page: 15, current_page: 1, last_page: 1 })

  const filters = ref({
    type: '',            // 'admin' | 'exchange' | 'staff' | ''
    month: '',           // 'YYYY-MM' (covers this month)
    date_from: '',       // 'YYYY-MM'
    date_to: '',         // 'YYYY-MM'
    sort_by: 'created_at',
    sort_dir: 'desc',
    per_page: 15,
    page: 1,
  })

  // helpers
  const hasNextPage = computed(() => meta.value.current_page < meta.value.last_page)
  const hasPrevPage = computed(() => meta.value.current_page > 1)
  const clearError = () => (error.value = null)

  const normalizeItem = (raw) => ({
    id: raw.id,
    type: raw.type ?? '',
    start_month: raw.start_month ?? '',   // "YYYY-MM"
    end_month: raw.end_month ?? null,     // null | "YYYY-MM"
    performance_mark: Number(raw.performance_mark ?? 0),
    target_marks: Number(raw.target_marks ?? 0),
    report: raw.report ?? {},
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  })

  const sanitizeParams = (p) => {
    const out = {}
    const allow = ['type','month','date_from','date_to','sort_by','sort_dir','per_page','page']
    for (const k of allow) {
      const v = p[k]
      if (v !== undefined && v !== null && v !== '') out[k] = v
    }
    if (out.per_page) out.per_page = Number(out.per_page)
    if (out.page) out.page = Number(out.page)
    return out
  }

  const payloadFrom = (form) => ({
    type: String(form.type || '').toLowerCase(),
    start_month: String(form.start_month || ''), // "YYYY-MM"
    end_month: form.end_month ? String(form.end_month) : null,
    performance_mark: Number(form.performance_mark ?? 0),
    target_marks: Number(form.target_marks ?? 0),
    report: form.report ?? {}, // object
  })

  const messageFromError = (err) =>
    err?.response?.data?.message || err?.message || 'Something went wrong'

  const upsertLocal = (item) => {
    const i = items.value.findIndex(x => x.id === item.id)
    if (i === -1) items.value.unshift(item)
    else items.value.splice(i, 1, item)
  }

  const removeLocal = (id) => {
    const i = items.value.findIndex(x => x.id === id)
    if (i !== -1) items.value.splice(i, 1)
  }

  let _abort = null
  async function fetchList(params = {}) {
    clearError()
    const merged = { ...filters.value, ...params }
    const query = sanitizeParams(merged)

    if (_abort) _abort.abort()
    _abort = new AbortController()

    isLoading.value = true
    try {
      const res = await apiClient.get('/monthly-kpi-forms', { params: query, signal: _abort.signal })
      const data = res?.data?.data ?? []
      const m = res?.data?.meta ?? {}

      items.value = data.map(normalizeItem)
      meta.value = {
        total: m.total ?? data.length,
        per_page: m.per_page ?? merged.per_page,
        current_page: m.current_page ?? merged.page ?? 1,
        last_page: m.last_page ?? 1,
      }
      filters.value = { ...filters.value, ...query, page: meta.value.current_page, per_page: meta.value.per_page }
    } catch (err) {
      if (err?.name !== 'CanceledError' && err?.message !== 'canceled') {
        error.value = messageFromError(err)
      }
    } finally {
      isLoading.value = false
      _abort = null
    }
  }

  async function fetchOne(id) {
    clearError()
    isLoading.value = true
    try {
      const res = await apiClient.get(`/monthly-kpi-forms/${id}`)
      const item = normalizeItem(res?.data?.data ?? res?.data)
      current.value = item
      upsertLocal(item)
      return item
    } catch (err) {
      error.value = messageFromError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createForm(form) {
    clearError()
    isSaving.value = true
    try {
      const res = await apiClient.post('/monthly-kpi-forms', payloadFrom(form))
      const created = normalizeItem(res?.data?.data ?? res?.data)
      upsertLocal(created)
      return created
    } catch (err) {
      error.value = messageFromError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateForm(id, form) {
    clearError()
    isSaving.value = true
    try {
      const res = await apiClient.put(`/monthly-kpi-forms/${id}`, payloadFrom(form))
      const updated = normalizeItem(res?.data?.data ?? res?.data)
      upsertLocal(updated)
      if (current.value?.id === id) current.value = updated
      return updated
    } catch (err) {
      error.value = messageFromError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteForm(id) {
    clearError()
    isSaving.value = true
    try {
      await apiClient.delete(`/monthly-kpi-forms/${id}`)
      removeLocal(id)
      if (items.value.length === 0 && hasPrevPage.value) {
        await fetchList({ page: meta.value.current_page - 1 })
      }
      return true
    } catch (err) {
      error.value = messageFromError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function setPage(p) { return fetchList({ page: Number(p) }) }
  async function setPerPage(pp) { return fetchList({ per_page: Number(pp), page: 1 }) }

  function reset() {
    items.value = []
    current.value = null
    meta.value = { total: 0, per_page: 15, current_page: 1, last_page: 1 }
    filters.value = { type: '', month: '', date_from: '', date_to: '', sort_by: 'created_at', sort_dir: 'desc', per_page: 15, page: 1 }
    clearError()
    isLoading.value = false
    isSaving.value = false
  }

  return {
    items, current, isLoading, isSaving, error, meta, filters, hasNextPage, hasPrevPage,
    fetchList, fetchOne, createForm, updateForm, deleteForm, setPage, setPerPage, reset
  }
})
