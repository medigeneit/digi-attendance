import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

export const useUserClearanceStore = defineStore('userClearance', () => {
  const currentUserId   = ref(null)
  const currentUserInfo = ref(null)        // <- meta.user থেকে সেট হবে
  const items   = ref([])
  const loading = ref(false)
  const error   = ref('')

  const summary = ref({ total: 0, by_status: {}, by_handover_to: {} })

  const sort = ref({ by: 'created_at', dir: 'desc' })
  const filters = ref({
    search: '',
    status: '',
    department_id: '',
    template_item_id: '',
    handover_to: '',                       // <- NEW
  })

  function setUser(id) { currentUserId.value = id }

  async function fetch() {
    if (!currentUserId.value) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await apiClient.get(`/users/${currentUserId.value}/clearance-items`, {
        params: {
          include: 'department,templateItem,clearedBy',
          sort: sort.value.by,
          order: sort.value.dir,
          search:            filters.value.search || undefined,
          status:            filters.value.status || undefined,
          department_id:     filters.value.department_id || undefined,
          template_item_id:  filters.value.template_item_id || undefined,
          handover_to:       filters.value.handover_to || undefined, // <- NEW
        }
      })

      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      items.value = list

      const meta  = data?.meta  || {}
      const extra = data?.extra || {}
      const s = meta.summary || extra.summary || {}

      summary.value = {
        total: Number(s.total ?? list.length) || 0,
        by_status: s.by_status || {},
        by_handover_to: s.by_handover_to || {},
      }

      if (meta.user) currentUserInfo.value = meta.user
    } catch (e) {
      console.error(e)
      error.value = e?.response?.data?.message || 'Failed to load'
      items.value = []
      summary.value = { total: 0, by_status: {}, by_handover_to: {} }
      currentUserInfo.value = null
    } finally {
      loading.value = false
    }
  }

  function setSort(by) {
    if (sort.value.by === by) sort.value.dir = sort.value.dir === 'asc' ? 'desc' : 'asc'
    else { sort.value.by = by; sort.value.dir = 'desc' }
  }

  function resetFilters() {
    filters.value = { search: '', status: '', department_id: '', template_item_id: '', handover_to: '' }
  }

  return {
    currentUserId, currentUserInfo,
    items, loading, error, summary,
    sort, filters,
    setUser, fetch, setSort, resetFilters
  }
})
