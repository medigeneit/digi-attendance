import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

export const useUserClearanceStore = defineStore('userClearance', () => {
  const currentUserId = ref(null)
  const items   = ref([])
  const loading = ref(false)
  const error   = ref('')
  const summary = ref({ total: 0, by_status: {} })

  const sort = ref({ by: 'created_at', dir: 'desc' })
  const filters = ref({
    search: '',
    status: '',
    department_id: '',
    template_item_id: '',
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
          search: filters.value.search || undefined,
          status: filters.value.status || undefined,
          department_id: filters.value.department_id || undefined,
          template_item_id: filters.value.template_item_id || undefined,
          paginate: 0, // <-- non-paginated
          limit: 200,
        }
      })

      items.value = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      const extra = data?.extra || {}
      const meta  = data?.meta  || {}
      const s     = extra.summary || meta.summary || { total: items.value.length, by_status: {} }
      summary.value = { total: Number(s.total || items.value.length), by_status: s.by_status || {} }
    } catch (e) {
      console.error(e)
      error.value = e?.response?.data?.message || 'Failed to load'
      items.value = []
      summary.value = { total: 0, by_status: {} }
    } finally {
      loading.value = false
    }
  }

  function setSort(by) {
    if (sort.value.by === by) sort.value.dir = sort.value.dir === 'asc' ? 'desc' : 'asc'
    else { sort.value.by = by; sort.value.dir = 'desc' }
  }
  function resetFilters() {
    filters.value = { search: '', status: '', department_id: '', template_item_id: '' }
  }

  return { currentUserId, items, loading, error, summary, sort, filters, setUser, fetch, setSort, resetFilters }
})
