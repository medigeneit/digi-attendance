import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

const defaultForm = () => ({
  last_donation_date: '',
  available_from: '',
  is_available: true,
  availability_note: '',
  has_disease: false,
  disease_note: '',
  status: 'active',
  notes: '',
})

const toBoolean = (value) =>
  value === true || value === 'true' || value === 1 || value === '1'

const messageFromError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback

const extractValidationErrors = (err, fallback) => ({
  message: err?.response?.data?.message || fallback,
  errors: err?.response?.data?.errors || {},
})

export const useBloodDonorMeStore = defineStore('bloodDonorMe', () => {
  const modalOpen = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const deletingId = ref(null)
  const errorMessage = ref('')
  const errors = ref({})
  const user = ref(null)
  const histories = ref([])
  const form = ref(defaultForm())
  const editId = ref(null)

  function resetForm() {
    form.value = defaultForm()
    editId.value = null
    errors.value = {}
    errorMessage.value = ''
  }

  function calcAvailableFrom(dateStr) {
    if (!dateStr) return ''
    const base = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(base.getTime())) return ''
    base.setDate(base.getDate() + 90)
    const year = base.getFullYear()
    const month = String(base.getMonth() + 1).padStart(2, '0')
    const day = String(base.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function setLastDonationDate(val) {
    form.value.last_donation_date = val
    form.value.available_from = calcAvailableFrom(val)
  }

  async function fetchMe() {
    loading.value = true
    errorMessage.value = ''
    errors.value = {}

    try {
      const res = await apiClient.get('/blood-donor/me')
      const payload = res?.data || {}
      user.value = payload.user || null
      histories.value = Array.isArray(payload.histories) ? payload.histories : []
    } catch (err) {
      errorMessage.value = messageFromError(err, 'Failed to load donor profile.')
    } finally {
      loading.value = false
    }
  }

  async function openModal() {
    modalOpen.value = true
    resetForm()
    await fetchMe()
  }

  function closeModal() {
    modalOpen.value = false
    resetForm()
    user.value = null
    histories.value = []
  }

  function editHistory(row) {
    if (!row) return
    editId.value = row.id ?? null
    form.value = {
      ...defaultForm(),
      last_donation_date: row.last_donation_date || '',
      is_available: toBoolean(row.is_available),
      availability_note: row.availability_note || '',
      has_disease: toBoolean(row.has_disease),
      disease_note: row.disease_note || '',
      status: row.status || 'active',
      notes: row.notes || '',
    }
    setLastDonationDate(form.value.last_donation_date)
    if (!form.value.has_disease) {
      form.value.disease_note = ''
    }
    errors.value = {}
    errorMessage.value = ''
  }

  async function refreshListOptional() {
    try {
      const mod = await import('@/stores/bloodDonorAdmin')
      const donorStore = mod?.useBloodDonorAdminStore?.()
      if (donorStore?.fetchDonors) {
        await donorStore.fetchDonors()
      }
    } catch (err) {
      // Optional refresh only.
    }
  }

  async function saveHistory() {
    if (saving.value) return false
    saving.value = true
    errorMessage.value = ''
    errors.value = {}

    const payload = {
      last_donation_date: form.value.last_donation_date || null,
      is_available: !!form.value.is_available,
      availability_note: form.value.availability_note || null,
      has_disease: !!form.value.has_disease,
      disease_note: form.value.has_disease ? form.value.disease_note || null : null,
      notes: form.value.notes || null,
      status: form.value.status || 'active',
    }

    try {
      if (editId.value) {
        await apiClient.put(`/blood-donor/me/histories/${editId.value}`, payload)
      } else {
        await apiClient.post('/blood-donor/me/histories', payload)
      }
      await fetchMe()
      resetForm()
      await refreshListOptional()
      return true
    } catch (err) {
      if (err?.response?.status === 422) {
        const { message, errors: fieldErrors } = extractValidationErrors(
          err,
          'Validation error.'
        )
        errorMessage.value = message
        errors.value = fieldErrors
      } else {
        errorMessage.value = messageFromError(err, 'Failed to save donation history.')
      }
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteHistory(id) {
    if (!id) return
    deletingId.value = id
    errorMessage.value = ''
    errors.value = {}

    try {
      await apiClient.delete(`/blood-donor/me/histories/${id}`)
      await fetchMe()
      if (editId.value === id) {
        resetForm()
      }
      await refreshListOptional()
    } catch (err) {
      errorMessage.value = messageFromError(err, 'Failed to delete donation history.')
    } finally {
      deletingId.value = null
    }
  }

  return {
    modalOpen,
    loading,
    saving,
    deletingId,
    errorMessage,
    errors,
    user,
    histories,
    form,
    editId,
    openModal,
    closeModal,
    fetchMe,
    resetForm,
    calcAvailableFrom,
    setLastDonationDate,
    editHistory,
    saveHistory,
    deleteHistory,
    refreshListOptional,
  }
})
