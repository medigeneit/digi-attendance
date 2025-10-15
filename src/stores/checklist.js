import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../axios'

export const useChecklistStore = defineStore('checklist', () => {
  // ------------------------
  // state
  // ------------------------
  const loading   = ref(false)
  const error     = ref(null)
  const checklist = ref(null) // { id, template, items: [...] }

  // ------------------------
  // helpers (shape-safe)
  // ------------------------
  const boolish = (v) => {
    if (typeof v === 'boolean') return v
    if (typeof v === 'number')  return v === 1
    if (typeof v === 'string')  return v === '1' || v.toLowerCase() === 'true'
    return !!v
  }

  const labelFrom = (i) =>
    i?.label ?? i?.template_item?.label ?? i?.templateItem?.label ?? ''

  const requiredFrom = (i) =>
    boolish(i?.required ?? i?.template_item?.required ?? i?.templateItem?.required)

  const orderFrom = (i) =>
    Number(i?.order_no ?? i?.template_item?.order_no ?? i?.templateItem?.order_no ?? 0)

  // Normalize a single item (keeps original keys; adds safe props)
  function normalizeItem(i) {
    return {
      ...i,
      // derived, non-breaking helpers
      _label:    labelFrom(i),
      _required: requiredFrom(i),
      _order:    orderFrom(i),
    }
  }

  // Normalize whole checklist payload (sort items by order)
  function normalizeChecklist(payload) {
    if (!payload) return null
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeItem) : []
    items.sort((a, b) => a._order - b._order)
    return { ...payload, items }
  }

  // ------------------------
  // getters
  // ------------------------
  const items = computed(() => checklist.value?.items ?? [])

  const requiredItems = computed(() => items.value.filter(i => i._required))

  const completion = computed(() => {
    const total = requiredItems.value.length
    if (!total) return 100
    const done = requiredItems.value.filter(i => i.status === 'done').length
    return Math.round((done / total) * 100)
  })

  // public helpers for components
  const labelOf    = (i) => i?._label ?? labelFrom(i)
  const requiredOf = (i) => i?._required ?? requiredFrom(i)

  // ------------------------
  // actions
  // ------------------------
  async function ensureChecklist(userId, templateId) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.post(`/users/${Number(userId)}/checklists`, {
        template_id: Number(templateId)
      })
      checklist.value = normalizeChecklist(data.data)
    } catch (e) {
      error.value = e
      console.error('ensureChecklist failed:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchChecklist(userId, checklistId) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.get(`/users/${Number(userId)}/checklists/${Number(checklistId)}`)
      checklist.value = normalizeChecklist(data.data)
    } catch (e) {
      error.value = e
      console.error('fetchChecklist failed:', e)
    } finally {
      loading.value = false
    }
  }

  // optimistic single-item update (status/comment/attachment_id)
  async function saveItem(item, patch) {
    const list = checklist.value?.items || []
    const idx  = list.findIndex(x => x.id === item.id)
    const target = idx >= 0 ? list[idx] : item

    const backup = { ...target }
    
    Object.assign(target, patch)

    try {
      const { data } = await apiClient.patch(`/checklist-items/${target.id}`, patch)
      // normalize merged server response to keep helpers correct
      const merged = normalizeItem({ ...target, ...(data?.data || {}) })
      list[idx] = merged
    } catch (e) {
      // rollback
      if (idx >= 0) list[idx] = normalizeItem(backup)
      throw e
    }
  }

 async function detachAttachment(itemOrId, { deleteDocument = true, force = false } = {}) {

  console.log('detachAttachment', itemOrId, { deleteDocument, force });
  
    const list = checklist.value?.items || []
    const itemId = typeof itemOrId === 'object' ? itemOrId?.id : itemOrId

    if (!itemId) return { ok: true, data: null }

    const idx = list.findIndex(x => x.id === Number(itemId))
    const target = idx >= 0 ? list[idx] : { id: Number(itemId) }

    // nothing attached? noop
    if (!target?.attachment_id && !target?.attachment) {
      return { ok: true, data: target }
    }

    // optimistic update
    const backup = idx >= 0 ? { ...list[idx] } : null
    if (idx >= 0) {
      list[idx] = { ...list[idx], attachment_id: null, attachment: null }
    }

    try {
      const { data } = await apiClient.patch(
        `/checklist-items/${itemId}/detach-attachment`,
        { delete_document: !!deleteDocument, force: !!force }
      )

      const fresh = { ...(data?.data || {}) }
      if (idx >= 0) list[idx] = { ...list[idx], ...fresh }

      window?.notify?.success && window.notify.success('Attachment removed')
      return { ok: true, data: fresh }
    } catch (e) {
      if (idx >= 0 && backup) list[idx] = backup
      window?.notify?.error && window.notify.error('Failed to remove attachment')
      throw e
    }
  }

  // generic document upload (backend returns {id,url,...})
  async function uploadDocument(file) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data.data
  }

  async function reset() {
    loading.value = false
    error.value = null
    checklist.value = null
  }

  return {
    // state
    loading, error, checklist,
    // getters
    items, requiredItems, completion, labelOf, requiredOf,
    // actions
    ensureChecklist, fetchChecklist, saveItem, uploadDocument, reset, detachAttachment
  }
})
