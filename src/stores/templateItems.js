import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

export const useTemplateItemsStore = defineStore('templateItems', () => {
  const items = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  function sortInPlace() {
    items.value.sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0) || a.id - b.id)
  }

  async function fetch(templateId) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apiClient.get(`/checklist-templates/${templateId}/items`)
      items.value = (data?.data || []).map(x => ({ ...x }))
      sortInPlace()
    } catch (e) {
      error.value = e?.response?.data?.message || 'Failed to load items'
      window?.notify?.error?.(error.value)
    } finally {
      loading.value = false
    }
  }

  async function add(templateId, payload) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apiClient.post(`/checklist-templates/${templateId}/items`, payload)
      const row = data?.data || {}
      items.value.push(row)
      sortInPlace()
      window?.notify?.success?.('Item added')
      return row
    } catch (e) {
      error.value = e?.response?.data?.message || 'Failed to add item'
      window?.notify?.error?.(error.value)
      throw e
    } finally {
      saving.value = false
    }
  }

  async function update(itemId, patch) {
    saving.value = true
    error.value = ''
    // optimistic
    const idx = items.value.findIndex(x => x.id === itemId)
    const backup = idx >= 0 ? { ...items.value[idx] } : null
    if (idx >= 0) items.value[idx] = { ...items.value[idx], ...patch }

    try {
      const { data } = await apiClient.patch(`/checklist-template-items/${itemId}`, patch)
      const fresh = data?.data || {}
      if (idx >= 0) items.value[idx] = { ...fresh }
      sortInPlace()
      return fresh
    } catch (e) {
      if (idx >= 0 && backup) items.value[idx] = backup
      error.value = e?.response?.data?.message || 'Failed to update item'
      window?.notify?.error?.(error.value)
      throw e
    } finally {
      saving.value = false
    }
  }

  async function remove(itemId) {
    saving.value = true
    error.value = ''
    // optimistic
    const idx = items.value.findIndex(x => x.id === itemId)
    const backup = idx >= 0 ? { ...items.value[idx] } : null
    if (idx >= 0) items.value.splice(idx, 1)

    try {
      await apiClient.delete(`/checklist-template-items/${itemId}`)
      window?.notify?.success?.('Item deleted')
    } catch (e) {
      if (idx >= 0 && backup) items.value.splice(idx, 0, backup)
      error.value = e?.response?.data?.message || 'Failed to delete item'
      window?.notify?.error?.(error.value)
      throw e
    } finally {
      saving.value = false
    }
  }

  // Simple reorder helpers (no external dnd lib)
  function moveUp(id) {
    const i = items.value.findIndex(x => x.id === id)
    if (i > 0) {
      const prev = items.value[i - 1]
      const cur  = items.value[i]
      const tmp  = prev.order_no
      prev.order_no = cur.order_no
      cur.order_no  = tmp
      items.value[i - 1] = cur
      items.value[i] = prev
    }
  }
  function moveDown(id) {
    const i = items.value.findIndex(x => x.id === id)
    if (i >= 0 && i < items.value.length - 1) {
      const next = items.value[i + 1]
      const cur  = items.value[i]
      const tmp  = next.order_no
      next.order_no = cur.order_no
      cur.order_no  = tmp
      items.value[i + 1] = cur
      items.value[i] = next
    }
  }

  // Persist whole current order (PATCH each changed row)
  async function saveOrder() {
    saving.value = true
    try {
      const tasks = items.value.map((row, pos) => {
        const desired = pos // zero-based; adjust if you want 1-based
        if ((row.order_no ?? 0) !== desired) {
          row.order_no = desired
          return  apiClient.patch(`/checklist-template-items/${row.id}`, desired)
        }
        return Promise.resolve()
      })
      await Promise.allSettled(tasks)
      window?.notify?.success?.('Order saved')
    } catch {
      window?.notify?.error?.('Failed to save order')
      throw new Error('Failed to save order')
    } finally {
      saving.value = false
      sortInPlace()
    }
  }

  return {
    items, loading, saving, error,
    fetch, add, update, remove,
    moveUp, moveDown, saveOrder
  }
})
