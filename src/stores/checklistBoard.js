import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../axios'

export const useChecklistBoardStore = defineStore('checklistBoard', () => {

  const loading = ref(false)
  const error = ref(null)

  // filters (camelCase in store; mapped to snake_case for API)
  const type = ref('joining')          // 'joining' | 'exit'
  const companyId = ref(null)
  const departmentId = ref(null)
  const search = ref('')

  // data
  const templates = ref([])            // all templates
  const users = ref([])                // API-filtered users
  const rows = ref(Object.create(null))// userId -> state row (summary/detail)

  // private inflight handle (avoid race)
  const _inflightUsers = ref(null)

  // -------------------------
  // helpers
  // -------------------------
  const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : '')
  const safeArray = (v) => (Array.isArray(v) ? v : [])
  const keyOf = (id) => String(id ?? '')
  const parseData = (res) => (res?.data?.data ?? res?.data)

  // Robust readers (still useful to render)
  const companyNameOf = (u) => u?.company?.name || u?.company_name || u?.organization?.name || '—'
  const departmentNameOf = (u) => u?.department?.name || u?.dept?.name || u?.department_name || '—'
  const positionTitleOf = (u) => u?.position?.title || u?.designation || '—'

  // Build snake_case params for the API
  const buildUserParams = (extra = {}) => {
    const p = {
      type: type.value || undefined,
      company_id: companyId.value || undefined,
      department_id: departmentId.value || undefined,
      search: (search.value || '').trim() || undefined,
      template_id: templateId.value || undefined, // optional: useful if backend uses it
    }
    // strip null/undefined/empty
    Object.keys(p).forEach(k => (p[k] == null || p[k] === '') && delete p[k])
    return { ...p, ...extra }
  }

  // -------------------------
  // getters
  // -------------------------
  const templateByType = computed(() => {
    const want = toLower(type.value)
    return templates.value.find(t => toLower(t?.type) === want) || null
  })
  const templateId = computed(() => templateByType.value?.id ?? null)

  // -------------------------
  // actions: API
  // -------------------------
  async function loadTemplates(params = {}) {
    try {
      const res = await apiClient.get('/checklist-templates', { params })
      templates.value = safeArray(parseData(res))
    } catch (e) {
      templates.value = []
      error.value = e
      throw e
    }
  }


  async function loadUsers(extraParams = {}) {
    if (_inflightUsers.value) {
      try { await _inflightUsers.value } catch { /* ignore */ }
    }

    loading.value = true
    error.value = null
    const params = buildUserParams(extraParams)

    const req = (async () => {
      try {
        const res = await apiClient.get('/users-checklists', { params })
        users.value = safeArray(parseData(res))
      } catch (e) {
        users.value = []
        error.value = e
        throw e
      } finally {
        loading.value = false
        _inflightUsers.value = null
      }
    })()

    _inflightUsers.value = req
    return req
  }

  
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

  async function loadBoard({ withUsers = true, templateParams = {}, userParams = {} } = {}) {
    loading.value = true
    error.value = null
    try {
      if (!templates.value.length) {
        await loadTemplates(templateParams)
      }
      if (withUsers) {
        await loadUsers(userParams) // server-side filtering
      }
    } catch (e) {
      error.value = e
      throw e
    } finally {
      loading.value = false
    }
  }

  function setUsers(list) { users.value = safeArray(list) }

  function setFilters(partial = {}) {
    if ('type' in partial) type.value = partial.type
    if ('companyId' in partial) companyId.value = partial.companyId
    if ('departmentId' in partial) departmentId.value = partial.departmentId
    if ('search' in partial) search.value = partial.search
  }

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

    // getters
    templateByType, templateId,
    companyNameOf, departmentNameOf, positionTitleOf,

    // actions
    loadBoard, loadTemplates, loadUsers,
    setUsers, setFilters, resetFilters, clearRowCache,
  }
})
