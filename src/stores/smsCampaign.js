import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

const messageFromError = (err, fallback) => err?.response?.data?.message || fallback

export const useSmsCampaignStore = defineStore('smsCampaign', () => {
  const campaigns = ref([])
  const meta = ref({ page: 1, per_page: 20, total: 0, last_page: 1 })
  const statusCounts = ref({})
  const loading = ref(false)
  const error = ref(null)

  const campaign = ref(null)
  const recipientStatusCounts = ref({})
  const showLoading = ref(false)

  const previewResult = ref(null) // { recipient_count, sample }
  const previewLoading = ref(false)
  const previewError = ref(null)

  const saving = ref(false)
  const sending = ref(false)

  async function fetchCampaigns(params = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get('/sms-campaigns', { params: { page: 1, ...params } })
      const payload = res?.data?.data || {}
      campaigns.value = payload.data || []
      statusCounts.value = res?.data?.status_counts || {}
      meta.value = {
        page: payload.current_page || 1,
        per_page: payload.per_page || meta.value.per_page,
        total: payload.total || 0,
        last_page: payload.last_page || 1,
      }
    } catch (err) {
      campaigns.value = []
      error.value = messageFromError(err, 'Failed to load campaigns.')
    } finally {
      loading.value = false
    }
  }

  async function fetchCampaign(id) {
    showLoading.value = true
    error.value = null
    try {
      const res = await apiClient.get(`/sms-campaigns/${id}`)
      campaign.value = res?.data?.data || null
      recipientStatusCounts.value = res?.data?.recipient_status_counts || {}
    } catch (err) {
      campaign.value = null
      error.value = messageFromError(err, 'Failed to load campaign.')
    } finally {
      showLoading.value = false
    }
  }

  function buildFilterPayload(filters) {
    return {
      company_ids: filters.company_ids || [],
      department_ids: filters.department_ids || [],
      employee_types: filters.employee_types || [],
      employee_ids: filters.employee_ids || [],
      include_inactive: !!filters.include_inactive,
    }
  }

  async function previewRecipients(filters) {
    previewLoading.value = true
    previewError.value = null
    try {
      const res = await apiClient.post('/sms-campaigns/preview', buildFilterPayload(filters))
      previewResult.value = {
        recipient_count: res?.data?.recipient_count || 0,
        sample: res?.data?.sample || [],
      }
      return previewResult.value
    } catch (err) {
      previewResult.value = null
      previewError.value = messageFromError(err, 'Failed to preview recipients.')
      throw err
    } finally {
      previewLoading.value = false
    }
  }

  async function createCampaign(form) {
    saving.value = true
    error.value = null
    try {
      const payload = {
        ...buildFilterPayload(form),
        name: form.name,
        message: form.message,
      }
      const res = await apiClient.post('/sms-campaigns', payload)
      return res?.data?.data
    } catch (err) {
      error.value = messageFromError(err, 'Failed to create campaign.')
      throw err
    } finally {
      saving.value = false
    }
  }

  async function sendCampaign(id) {
    sending.value = true
    error.value = null
    try {
      const res = await apiClient.post(`/sms-campaigns/${id}/send`)
      return res?.data?.data
    } catch (err) {
      error.value = messageFromError(err, 'Failed to queue campaign for sending.')
      throw err
    } finally {
      sending.value = false
    }
  }

  return {
    campaigns,
    meta,
    statusCounts,
    loading,
    error,
    campaign,
    recipientStatusCounts,
    showLoading,
    previewResult,
    previewLoading,
    previewError,
    saving,
    sending,
    fetchCampaigns,
    fetchCampaign,
    previewRecipients,
    createCampaign,
    sendCampaign,
  }
})
