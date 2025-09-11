import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

export const useMonthlyKpiFormItemsStore = defineStore('monthlyKpiFormItems', () => {
  const items = ref([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref(null)

  const normalize = (r) => ({
    id: r.id,
    monthly_kpi_form_id: r.monthly_kpi_form_id,
    criteria_id: r.criteria_id,
    title: r.title || '',
    description: r.description || '',
    max_score: Number(r.max_score ?? 0),
    sort_order: Number(r.sort_order ?? 1),
    criteria: r.criteria || null,
  })

  const messageFromError = (err) => err?.response?.data?.message || err?.message || 'Something went wrong'
  const clearError = () => (error.value = null)

  async function fetchItems(formId) {
    clearError(); isLoading.value = true
    try {
      const res = await apiClient.get(`/monthly-kpi-forms/${formId}/items`)
      items.value = (res?.data?.data || res?.data || []).map(normalize)
    } catch (err) {
      error.value = messageFromError(err); throw err
    } finally { isLoading.value = false }
  }

  async function fetchAvailableCriteria(formId, q = '') {
    const res = await apiClient.get(`/monthly-kpi-forms/${formId}/items/available-criteria`, { params: { q } })
    return res?.data?.data || []
  }

  async function createItem(formId, payload) {
    clearError(); isSaving.value = true
    try {
      const res = await apiClient.post(`/monthly-kpi-forms/${formId}/items`, payload)
      const created = normalize(res?.data?.data || res?.data)
      items.value.push(created)
      // keep items ordered
      items.value.sort((a, b) => a.sort_order - b.sort_order)
      return created
    } catch (err) {
      error.value = messageFromError(err); throw err
    } finally { isSaving.value = false }
  }

  async function updateItem(formId, itemId, payload) {
    clearError(); isSaving.value = true
    try {
      const res = await apiClient.put(`/monthly-kpi-forms/${formId}/items/${itemId}`, payload)
      const updated = normalize(res?.data?.data || res?.data)
      const i = items.value.findIndex(x => x.id === itemId)
      if (i !== -1) items.value.splice(i, 1, updated)
      return updated
    } catch (err) {
      error.value = messageFromError(err); throw err
    } finally { isSaving.value = false }
  }

  async function deleteItem(formId, itemId) {
    clearError(); isSaving.value = true
    try {
      await apiClient.delete(`/monthly-kpi-forms/${formId}/items/${itemId}`)
      const i = items.value.findIndex(x => x.id === itemId)
      if (i !== -1) items.value.splice(i, 1)
      return true
    } catch (err) {
      error.value = messageFromError(err); throw err
    } finally { isSaving.value = false }
  }

  async function reorder(formId, ids) {
    clearError(); isSaving.value = true
    try {
      await apiClient.post(`/monthly-kpi-forms/${formId}/items/reorder`, { ids })
      // reassign local order
      items.value = ids.map((id, i) => {
        const it = items.value.find(x => x.id === id)
        return it ? { ...it, sort_order: i + 1 } : null
      }).filter(Boolean)
    } catch (err) {
      error.value = messageFromError(err); throw err
    } finally { isSaving.value = false }
  }

  return { items, isLoading, isSaving, error, fetchItems, fetchAvailableCriteria, createItem, updateItem, deleteItem, reorder }
})
