import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../axios' // <- তোমার axios instance

export const useChecklistStore = defineStore('checklist', () => {
  // state
  const loading = ref(false)
  const error = ref(null)
  const checklist = ref(null) // { id, template, items: [...] }

  // getters
  const items = computed(() => checklist.value?.items || [])

  const requiredItems = computed(() =>
    items.value.filter(i => (i.required ?? i?.template_item?.required ?? i?.templateItem?.required) === true)
  )

  const completion = computed(() => {
    const total = requiredItems.value.length
    if (!total) return 100
    const done = requiredItems.value.filter(i => i.status === 'done').length
    return Math.round((done / total) * 100)
  })

  // helpers
  const labelOf = i => i.label || i?.template_item?.label || i?.templateItem?.label || ''
  
  const requiredOf = i => !!(i.required ?? i?.template_item?.required ?? i?.templateItem?.required)

  // actions
  async function ensureChecklist(userId, templateId) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.post(`/users/${userId}/checklists`, { template_id: templateId })
      checklist.value = data.data
    } catch (e) {
      error.value = e
      console.error(e)
    } finally { loading.value = false }
  }

  async function fetchChecklist(userId, checklistId) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.get(`/users/${userId}/checklists/${checklistId}`)
      checklist.value = data.data
    } catch (e) {
      error.value = e
      console.error(e)
    } finally { loading.value = false }
  }

  // optimistic single-item update
  async function saveItem(item, patch) {
    const backup = { ...item }
    Object.assign(item, patch)
    try {
      const { data } = await apiClient.patch(`/checklist-items/${item.id}`, patch)
      Object.assign(item, data.data)
    } catch (e) {
      Object.assign(item, backup) // rollback
      throw e
    }
  }

  // S3 doc upload via backend /documents
  async function uploadDocument(file) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data.data // {id, url, name, mime, size}
  }

  return {
    // state
    loading, error, checklist,
    // getters
    items, requiredItems, completion, labelOf, requiredOf,
    // actions
    ensureChecklist, fetchChecklist, saveItem, uploadDocument
  }
})
