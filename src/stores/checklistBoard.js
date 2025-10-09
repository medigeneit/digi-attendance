import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../axios'

export const useChecklistBoardStore = defineStore('checklistBoard', () => {
  const loading = ref(false)
  const error = ref(null)

  // filters
  const type = ref('joining') // 'joining' | 'exit'
  const companyId = ref(null)
  const departmentId = ref(null)
  const search = ref('')

  // data
  const templates = ref([]) // all templates
  const users = ref([])     // raw/loaded users
  const rows = ref(Object.create(null)) // userId -> summary/state row

  // -------------------------
  // helpers
  // -------------------------
  const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : '')
  const safeArray = (v) => (Array.isArray(v) ? v : [])
  const keyOf = (id) => String(id ?? '')

  // Robust name readers (shape-safe)
  const companyNameOf = (u) => u?.company?.name || u?.company_name || u?.organization?.name || '—'
  const departmentNameOf = (u) => u?.department?.name || u?.dept?.name || u?.department_name || '—'
  const positionTitleOf = (u) => u?.position?.title || u?.designation || '—'

  // -------------------------
  // derived
  // -------------------------
  const templateByType = computed(() => {
    const want = toLower(type.value)
    return templates.value.find(t => toLower(t?.type) === want) || null
  })
  const templateId = computed(() => templateByType.value?.id ?? null)

  const filteredUsers = computed(() => {
    const q = toLower(search.value)
    const cid = companyId.value
    const did = departmentId.value

    console.log('ok', users.value);
    

    return safeArray(users.value).filter(u => {
      if (cid && String(u?.company_id ?? u?.company?.id) !== String(cid)) return false
      if (did && String(u?.department_id ?? u?.department?.id) !== String(did)) return false

      if (!q) return true
      const bucket = [
        u?.name, u?.email, u?.phone,
        companyNameOf(u), departmentNameOf(u), positionTitleOf(u)
      ].map(toLower).join(' ')
      return bucket.includes(q)
    })
  })

  const grouped = computed(() => {
    const out = Object.create(null)
    filteredUsers.value.forEach(u => {
      const c = companyNameOf(u)
      const d = departmentNameOf(u)
      if (!out[c]) out[c] = Object.create(null)
      if (!out[c][d]) out[c][d] = []
      out[c][d].push(u)
    })
    return out
  })

  // -------------------------
  // API loaders
  // -------------------------
  async function loadTemplates(params = {}) {
    try {
      const res = await apiClient.get('/checklist-templates', { params })
      const data = res?.data?.data ?? res?.data
      templates.value = safeArray(data)
    } catch (e) {
      error.value = e
      console.error('loadTemplates failed:', e)
      templates.value = []
      throw e
    }
  }

  async function loadUsers(params = {}) {
    try {
      const res = await apiClient.get('/users', { params })
      const data = res?.data?.data ?? res?.data
      users.value = safeArray(data)
    } catch (e) {
      error.value = e
      console.error('loadUsers failed:', e)
      users.value = []
      throw e
    }
  }

  // Row initializer/guard
  function initRow(userId) {
    const k = keyOf(userId)
    if (!rows.value[k]) {
      rows.value[k] = {
        loadedList: false,
        loading: false,
        checklistId: null,
        status: 'not_started',
        percent: 0,
        items: null,
        expanded: false,
        error: null,
        _inflightList: null,
        _inflightDetail: null,
      }
    }
    return rows.value[k]
  }

  // Ensure a lightweight checklist list for a user (no heavy details)
  async function ensureRow(userId) {
    const k = keyOf(userId)
    if (!templateId.value) return
    const r = initRow(userId)

    if (r.loadedList || r._inflightList) return r._inflightList

    r.loading = true
    r._inflightList = (async () => {
      try {
        const res = await apiClient.get(`/users/${userId}/checklists`)
        const list = res?.data?.data ?? res?.data ?? []
        r.loadedList = true

        const match = safeArray(list).find(x => +x?.template_id === +templateId.value)
        if (!match) {
          r.checklistId = null
          r.status = 'not_started'
          r.percent = 0
          r.items = null
        } else {
          r.checklistId = match.id
          // If API provides overall status use it, otherwise mark in_progress until detail is fetched
          r.status = match.status || 'in_progress'
        }
      } catch (e) {
        console.error('ensureRow failed:', e)
        r.error = e
      } finally {
        r.loading = false
        r._inflightList = null
      }
    })()

    return r._inflightList
  }

  // Load full checklist detail when row expanded (saves calls)
  async function loadChecklistDetail(userId, checklistId) {
    const k = keyOf(userId)                  // FIX: was `user.id`
    const r = initRow(userId)

    if (!templateId.value) return
    if (!checklistId && !r.checklistId) return // nothing to load
    const id = checklistId || r.checklistId
    if (r.items || r._inflightDetail) return r._inflightDetail

    r.loading = true
    r._inflightDetail = (async () => {
      try {
        const res = await apiClient.get(`/users/${userId}/checklists/${id}`)
        const detail = res?.data?.data ?? res?.data ?? {}
        const items = safeArray(detail.items)

        // Compute % from required items
        const isReq = (i) => {
          // check several shapes: i.required, i.template_item.required, i.templateItem.required
          if (typeof i?.required === 'boolean') return i.required
          if (typeof i?.template_item?.required === 'boolean') return i.template_item.required
          if (typeof i?.templateItem?.required === 'boolean') return i.templateItem.required
          return false
        }
        const required = items.filter(isReq)
        const done = required.filter(i => i?.status === 'done').length
        r.percent = required.length ? Math.round((done / required.length) * 100) : 100
        r.status = r.percent === 100 ? 'completed' : (detail?.status || 'in_progress')
        r.items = items
      } catch (e) {
        console.error('loadChecklistDetail failed:', e)
        r.error = e
      } finally {
        r.loading = false
        r._inflightDetail = null
        // force reactivity on nested object
        rows.value[k] = { ...r }
      }
    })()

    return r._inflightDetail
  }

  // Toggle expansion (and lazy-load details)
  async function toggleExpanded(userId, expand = undefined) {
    const r = initRow(userId)
    r.expanded = (typeof expand === 'boolean') ? expand : !r.expanded
    if (r.expanded && !r.items) {
      await ensureRow(userId)
      if (r.checklistId) await loadChecklistDetail(userId, r.checklistId)
    }
  }

  // Controller: full page load
  async function loadBoard({ withUsers = false, userParams = {}, templateParams = {} } = {}) {
    loading.value = true
    error.value = null
    try {
      if (!templates.value.length) {
        await loadTemplates(templateParams)
      }
      if (withUsers) {
        await loadUsers(userParams)
      }
      // initialize rows for visible users (no heavy detail yet)
      filteredUsers.value.forEach(u => { void ensureRow(u.id) })
    } catch (e) {
      error.value = e
      console.error('loadBoard failed:', e)
    } finally {
      loading.value = false
    }
  }

  // Utilities
  function setUsers(list) { users.value = safeArray(list) }
  function resetFilters() {
    type.value = 'joining'
    companyId.value = null
    departmentId.value = null
    search.value = ''
  }
  function clearRowCache() { rows.value = Object.create(null) }

  return {
    // state
    loading, error,
    type, companyId, departmentId, search,
    templates, users, rows,

    // derived
    templateByType, templateId,
    filteredUsers, grouped,
    companyNameOf, departmentNameOf, positionTitleOf,

    // actions
    loadBoard, loadTemplates, loadUsers,
    setUsers, resetFilters, clearRowCache,
    ensureRow, loadChecklistDetail, toggleExpanded,
  }
})
