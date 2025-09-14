import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/axios'

export const useKpiAssignmentsStore = defineStore('kpiAssignments', () => {
  const items = ref([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref(null)

  const msg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong'

  async function fetchList() {
    isLoading.value = true; error.value = null
    try {
      const res = await api.get('/assignments')
      // paginate হলে res.data.data হবে; এখানে সিম্পল ধরলাম
      items.value = res?.data?.data || res?.data || []
    } catch (e) { error.value = msg(e); throw e } finally { isLoading.value = false }
  }

  async function create(payload) {
    isSaving.value = true; error.value = null
    try {
      const res = await api.post('/assignments', payload)
      await fetchList()
      return res?.data
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  async function close(id) {
    isSaving.value = true; error.value = null
    try {
      const res = await api.post(`/assignments/${id}/close`)
      await fetchList()
      return res?.data
    } catch (e) { error.value = msg(e); throw e } finally { isSaving.value = false }
  }

  return { items, isLoading, isSaving, error, fetchList, create, close }
})
