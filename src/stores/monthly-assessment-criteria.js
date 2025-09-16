import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../axios' // your configured axios instance

export const useMonthlyAssessmentCriteriaStore = defineStore('monthlyAssessmentCriteria', () => {
  // --- state ---
  const items = ref([])            // current page items
  const current = ref(null)        // optionally selected item (edit form)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref(null)

  const meta = ref({
    total: 0,
    per_page: 15,
    current_page: 1,
    last_page: 1,
  })

  // filters/sort
  const filters = ref({
    q: '',
    is_active: '',         
    date_from: '',
    date_to: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
    per_page: 15,
    page: 1,
  })

  // --- helpers ---
  const hasNextPage = computed(() => meta.value.current_page < meta.value.last_page)
  const hasPrevPage = computed(() => meta.value.current_page > 1)

  const clearError = () => { error.value = null }

  const normalizeItem = (raw) => ({
    id: raw.id,
    name: raw.name ?? '',
    description: raw.description ?? '',
    is_active: Number(raw.is_active ?? 0),
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  })

  const sanitizeParams = (p) => {
    const out = {}
    const allow = ['q','is_active','date_from','date_to','sort_by','sort_dir','per_page','page']
    for (const k of allow) {
      if (p[k] !== undefined && p[k] !== null && p[k] !== '') out[k] = p[k]
    }
    // cast
    if (out.is_active !== undefined) out.is_active = Number(out.is_active)
    if (out.per_page !== undefined) out.per_page = Number(out.per_page)
    if (out.page !== undefined) out.page = Number(out.page)
    return out
  }

  const payloadFrom = (form) => ({
    name: String(form.name ?? '').trim(),
    description: String(form.description ?? '').trim(),
    is_active: Number(form.is_active ?? 0),
  })

  const messageFromError = (err) =>
    err?.response?.data?.message || err?.message || 'Something went wrong'

  const upsertLocal = (item) => {
    const idx = items.value.findIndex((x) => x.id === item.id)
    if (idx === -1) items.value.unshift(item)
    else items.value.splice(idx, 1, item)
  }

  const removeLocal = (id) => {
    const idx = items.value.findIndex((x) => x.id === id)
    if (idx !== -1) items.value.splice(idx, 1)
  }

  // keep a single inflight list request (avoid racing on fast typing)
  let _listAbortController = null

  // --- actions ---
  async function fetchList(params = {}) {
    clearError()
    const merged = { ...filters.value, ...params }
    const query = sanitizeParams(merged)

    // cancel previous
    if (_listAbortController) _listAbortController.abort()
    _listAbortController = new AbortController()

    isLoading.value = true
    try {
      const res = await apiClient.get('/monthly-assessment-criteria', {
        params: query,
        signal: _listAbortController.signal,
      })

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
        // optional: console.error(err)
      }
    } finally {
      isLoading.value = false
      _listAbortController = null
    }
  }

  async function createCriteria(form) {
    clearError()
    isSaving.value = true
    try {
      const res = await apiClient.post('/monthly-assessment-criteria', payloadFrom(form))
      const created = normalizeItem(res?.data?.data ?? res?.data) // Resource returns {data: {...}}
      upsertLocal(created)
      return created
    } catch (err) {
      error.value = messageFromError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function fetchOne(id) {
    clearError()
    isLoading.value = true
    try {
      const res = await apiClient.get(`/monthly-assessment-criteria/${id}`)
      const item = normalizeItem(res?.data?.data ?? res?.data)
      current.value = item
      // also keep list version in sync if present
      upsertLocal(item)
      return item
    } catch (err) {
      error.value = messageFromError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateCriteria(id, form) {
    clearError()
    isSaving.value = true
    try {
      const res = await apiClient.put(`/monthly-assessment-criteria/${id}`, payloadFrom(form))
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

  async function deleteCriteria(id) {
    clearError()
    isSaving.value = true
    try {
      await apiClient.delete(`/monthly-assessment-criteria/${id}`)
      removeLocal(id)
      if (current.value?.id === id) current.value = null
      // optionally refresh current page if empty after delete and has prev
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

  // pagination helpers
  async function setPage(page) {
    return fetchList({ page: Number(page) })
  }
  async function setPerPage(perPage) {
    return fetchList({ per_page: Number(perPage), page: 1 })
  }

  // utility
  function setCurrent(item) {
    current.value = item ? normalizeItem(item) : null
  }
  function reset() {
    items.value = []
    current.value = null
    meta.value = { total: 0, per_page: 15, current_page: 1, last_page: 1 }
    filters.value = { q: '', is_active: '', date_from: '', date_to: '', sort_by: 'created_at', sort_dir: 'desc', per_page: 15, page: 1 }
    clearError()
    isLoading.value = false
    isSaving.value = false
  }

  return {
    // state
    items, current, isLoading, isSaving, error, meta, filters, hasNextPage, hasPrevPage,
    // actions
    fetchList, createCriteria, updateCriteria, deleteCriteria,
    setPage, setPerPage, setCurrent, reset, fetchOne,
  }
})
