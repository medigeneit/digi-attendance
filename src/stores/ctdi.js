import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import clientApi from '../axios'

export const useCTDIStore = defineStore('ctdi', () => {
  // filters
  const departmentId = ref(null)
  const templateId   = ref(null)
  const search       = ref('')
  const groupBy      = ref('section') // 'section' | 'responsible_unit' | 'none'

  // dropdown data
  const departments = ref([])
  const templates   = ref([])

  // data
  const templateItems = ref([]) // [{id, label, item_key, order_no, section, responsible_unit}]
  const assignments   = ref([]) // API থেকে পাওয়া rows
  const activeById    = ref(new Map()) // Map<template_item_id, boolean>
  const dirty         = ref(new Set())

  // ui
  const loading = ref(false)
  const saving  = ref(false)
  const error   = ref('')

  // summary
  const totalItems  = computed(() => templateItems.value.length)
  const activeCount = computed(() =>
    templateItems.value.reduce((n, it) => n + (activeById.value.get(it.id) ? 1 : 0), 0)
  )

  const filteredItems = computed(() => {
    const q = search.value.trim().toLowerCase()
    const arr = q
      ? templateItems.value.filter(it =>
          (it.label||'').toLowerCase().includes(q) ||
          (it.item_key||'').toLowerCase().includes(q)
        )
      : templateItems.value.slice()

    // sort by section/responsible + order_no
    arr.sort((a,b) => {
      const g = groupBy.value==='responsible_unit' ? 'responsible_unit'
               : groupBy.value==='section' ? 'section' : null
      if (g) {
        const ga = (a[g]||'').localeCompare(b[g]||'')
        if (ga !== 0) return ga
      }
      return (a.order_no??0) - (b.order_no??0)
    })
    return arr
  })

  const grouped = computed(() => {
    if (groupBy.value==='none') return { All: filteredItems.value }
    const key = groupBy.value==='responsible_unit' ? 'responsible_unit' : 'section'
    const map = {}
    for (const it of filteredItems.value) {
      const g = it[key] || '—'
      if (!map[g]) map[g] = []
      map[g].push(it)
    }
    return map
  })

  function setActive(id, v) {
    const cur = !!activeById.value.get(id)
    if (cur === v) return
    activeById.value.set(id, v)
    dirty.value.add(id)
  }
  function setGroup(groupName, v) {
    const list = grouped.value[groupName] || []
    for (const it of list) setActive(it.id, v)
  }
  function invertGroup(groupName) {
    const list = grouped.value[groupName] || []
    for (const it of list) setActive(it.id, !activeById.value.get(it.id))
  }
  function clearDirty() { dirty.value.clear() }

  // loads
  async function loadFilters() {
    error.value = ''
    try {
      const [d, t] = await Promise.all([
        clientApi.get('/departments', { params: { per_page: 1000 }}),
        clientApi.get('/checklist-templates', { params: { per_page: 1000 }}),
      ])
      departments.value = d.data?.data || d.data || []
      templates.value   = t.data?.data || t.data || []
    } catch (e) {
      error.value = 'Failed to load filters'
      console.error(e)
    }
  }

  async function loadTemplateItems(tplId) {
    templateItems.value = []
    error.value = ''
    try {
      const res = await clientApi.get(`/checklist-templates/${tplId}/items`)
      const rows = res.data?.data || res.data || []
      templateItems.value = rows.map(r => ({
        id: r.id,
        label: r.label,
        item_key: r.item_key,
        order_no: r.order_no ?? 0,
        section: r.section || null,
        responsible_unit: r.responsible_unit || null,
      }))
    } catch (e) {
      error.value = 'Failed to load template items'
      console.error(e)
    }
  }

  async function loadAssignments(deptId, tplId) {
    assignments.value = []
    activeById.value = new Map()
    dirty.value.clear()
    error.value = ''
    try {
      const res = await clientApi.get('/department-item-assignments', {
        params: { department_id: deptId, template_id: tplId, per_page: 1000 }
      })
      const rows = res.data?.data || res.data || []
      assignments.value = rows
      // mark active map (missing rows => inactive)
      const assignedActiveIds = new Set(
        rows.filter(r => r.is_active).map(r => r.template_item_id ?? r.templateItem?.id)
      )
      for (const it of templateItems.value) {
        activeById.value.set(it.id, assignedActiveIds.has(it.id))
      }
    } catch (e) {
      error.value = 'Failed to load assignments'
      console.error(e)
    }
  }

  async function refresh() {
    if (!departmentId.value || !templateId.value) return
    loading.value = true
    error.value = ''
    try {
      await loadTemplateItems(templateId.value)
      await loadAssignments(departmentId.value, templateId.value)
    } catch (e) {
      error.value = 'Refresh failed'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function saveBulk(notes = null) {
    if (!departmentId.value || !templateId.value) return
    const activeIds = templateItems.value
      .filter(it => activeById.value.get(it.id))
      .map(it => it.id)
    saving.value = true
    error.value = ''
    try {
      await clientApi.post('/department-item-assignments/bulk-upsert', {
        department_id: departmentId.value,
        template_id: templateId.value,
        active_item_ids: activeIds,
        notes,
      })
      clearDirty()
      await loadAssignments(departmentId.value, templateId.value)
    } catch (e) {
      error.value = 'Save failed'
      console.error(e)
    } finally {
      saving.value = false
    }
  }

  return {
    // state
    departmentId, templateId, search, groupBy,
    departments, templates,
    templateItems, assignments, activeById, dirty,
    loading, saving, error,
    // computed
    totalItems, activeCount, filteredItems, grouped,
    // actions
    loadFilters, refresh, saveBulk,
    setActive, setGroup, invertGroup, clearDirty,
  }
})
