import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

const messageFromError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback

const validationFromError = (err, fallback) => ({
  message: err?.response?.data?.message || fallback,
  errors: err?.response?.data?.errors || {},
})

export const useLifeEventsStore = defineStore('lifeEvents', () => {
  const myItems = ref([])
  const adminItems = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const formError = ref('')
  const errors = ref({})
  const meta = ref({ current_page: 1, per_page: 20, total: 0, last_page: 1 })

  async function fetchMine() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apiClient.get('/life-events/me')
      myItems.value = Array.isArray(data) ? data : []
    } catch (err) {
      myItems.value = []
      error.value = messageFromError(err, 'Failed to load life events.')
    } finally {
      loading.value = false
    }
  }

  async function submitMine(payload) {
    saving.value = true
    formError.value = ''
    errors.value = {}

    try {
      await apiClient.post('/life-events/me', payload)
      await fetchMine()
      return true
    } catch (err) {
      if (err?.response?.status === 422) {
        const validation = validationFromError(err, 'Validation error.')
        formError.value = validation.message
        errors.value = validation.errors
      } else {
        formError.value = messageFromError(err, 'Failed to submit life event.')
      }
      return false
    } finally {
      saving.value = false
    }
  }

  async function fetchAdmin(params = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apiClient.get('/life-events', { params })
      adminItems.value = data?.data || []
      meta.value = {
        current_page: data?.current_page || 1,
        per_page: data?.per_page || params.per_page || 20,
        total: data?.total || 0,
        last_page: data?.last_page || 1,
      }
    } catch (err) {
      adminItems.value = []
      error.value = messageFromError(err, 'Failed to load life event requests.')
    } finally {
      loading.value = false
    }
  }

  async function approve(id) {
    await apiClient.patch(`/life-events/${id}/approve`)
  }

  async function reject(id, rejectionReason) {
    await apiClient.patch(`/life-events/${id}/reject`, { rejection_reason: rejectionReason })
  }

  async function updateGiftStatus(id, giftStatus) {
    await apiClient.patch(`/life-events/${id}/gift-status`, { gift_status: giftStatus })
  }

  return {
    myItems,
    adminItems,
    loading,
    saving,
    error,
    formError,
    errors,
    meta,
    fetchMine,
    submitMine,
    fetchAdmin,
    approve,
    reject,
    updateGiftStatus,
  }
})
