import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '@/axios'

const defaultForm = () => ({
  user_id: '',
  last_donation_date: '',
  available_from: '',
  is_available: true,
  availability_note: '',
  has_disease: false,
  disease_note: '',
  status: 'active',
  notes: '',
})

const toBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1'

const messageFromError = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback

const extractValidationErrors = (err, fallback) => ({
  message: err?.response?.data?.message || fallback,
  errors: err?.response?.data?.errors || {},
})

export const useBloodDonorAdminStore = defineStore('bloodDonorAdmin', () => {
  // --------------------
  // list
  // --------------------
  const loading = ref(false)
  const error = ref('')
  const donors = ref([])

  const meta = ref({
    page: 1,
    per_page: 25,
    total: 0,
    last_page: 1,
  })

  const filters = ref({
    // backend supports:
    search: '',
    address: '',
    blood_group: '',
    status: '',
    availability: 'all', // all | available | not_available | soon
    soon_days: 15,
    last_donation_from: '',
    last_donation_to: '',
    per_page: 25,

    // EmployeeFilter (optional)
    company_id: '',
    department_id: '',
    employee_id: '',
    line_type: 'all',
  })

  const queryParams = computed(() => {
    const f = filters.value
    const params = {
      page: meta.value.page,
      per_page: f.per_page,
    }

    if (f.search) params.search = f.search
    if (f.address) params.address = f.address
    if (f.blood_group) params.blood_group = f.blood_group
    if (f.status) params.status = f.status
    if (f.last_donation_from) params.last_donation_from = f.last_donation_from
    if (f.last_donation_to) params.last_donation_to = f.last_donation_to

    if (f.availability && f.availability !== 'all') {
      params.availability = f.availability
      if (f.availability === 'soon') params.soon_days = f.soon_days || 15
    }

    if (f.company_id) params.company_id = f.company_id
    if (f.department_id) params.department_id = f.department_id
    if (f.employee_id) params.employee_id = f.employee_id
    if (f.line_type) params.line_type = f.line_type

    return params
  })

  async function fetchDonors() {
    loading.value = true
    error.value = ''
    try {
      const res = await apiClient.get('/blood-donors', { params: queryParams.value })
      const payload = res?.data || {}

      donors.value = payload.data || []
      meta.value = {
        page: payload.current_page || 1,
        per_page: payload.per_page || filters.value.per_page,
        total: payload.total || 0,
        last_page: payload.last_page || 1,
      }
    } catch (err) {
      donors.value = []
      meta.value = { page: 1, per_page: filters.value.per_page, total: 0, last_page: 1 }
      error.value = messageFromError(err, 'Failed to load donors.')
    } finally {
      loading.value = false
    }
  }

  function setPage(page) {
    meta.value.page = page
  }

  function resetFilters() {
    filters.value = {
      search: '',
      address: '',
      blood_group: '',
      status: '',
      availability: 'all',
      soon_days: 15,
      last_donation_from: '',
      last_donation_to: '',
      per_page: 25,
      company_id: '',
      department_id: '',
      employee_id: '',
      line_type: 'all',
    }
    meta.value.page = 1
  }

  // --------------------
  // admin modal + histories
  // --------------------
  const modalOpen = ref(false)
  const modalMode = ref('edit') // keep for UI
  const saving = ref(false)
  const deletingId = ref(null)
  const formError = ref('')
  const errors = ref({})
  const selectedUser = ref(null)

  const histories = ref([])
  const loadingHistories = ref(false)
  const historiesError = ref('')

  const form = ref(defaultForm())
  const editId = ref(null)

  function resetForm() {
    form.value = defaultForm()
    editId.value = null
    errors.value = {}
    formError.value = ''
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

  async function fetchHistories(userId) {
    if (!userId) {
      histories.value = []
      return
    }
    loadingHistories.value = true
    historiesError.value = ''
    try {
      const res = await apiClient.get('/blood-donor/me/histories', {
        params: { user_id: userId, per_page: 50 },
      })
      const payload = res?.data || {}
      histories.value = payload.data || []
    } catch (err) {
      histories.value = []
      historiesError.value = messageFromError(err, 'Failed to load histories.')
    } finally {
      loadingHistories.value = false
    }
  }

  function openModalForUser(user) {
    modalOpen.value = true
    modalMode.value = 'edit'
    resetForm()

    selectedUser.value = user
    form.value.user_id = user?.id ? String(user.id) : ''

    // preload histories
    if (user?.id) fetchHistories(user.id)
  }

  function closeModal() {
    modalOpen.value = false
    resetForm()
    selectedUser.value = null
    histories.value = []
    historiesError.value = ''
  }

  function editHistory(row) {
    if (!row) return
    editId.value = row.id ?? null

    form.value = {
      ...defaultForm(),
      user_id: String(row.user_id || selectedUser.value?.id || ''),
      last_donation_date: row.last_donation_date || '',
      is_available: toBoolean(row.is_available),
      availability_note: row.availability_note || '',
      has_disease: toBoolean(row.has_disease),
      disease_note: row.disease_note || '',
      status: row.status || 'active',
      notes: row.notes || '',
    }

    setLastDonationDate(form.value.last_donation_date)
    if (!form.value.has_disease) form.value.disease_note = ''
    errors.value = {}
    formError.value = ''
  }

  async function saveHistory() {
    if (saving.value) return false
    if (!form.value.user_id) {
      formError.value = 'Select a user first.'
      return false
    }

    saving.value = true
    formError.value = ''
    errors.value = {}

    const payload = {
      user_id: Number(form.value.user_id),
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

      // refresh histories + list
      await fetchHistories(payload.user_id)
      resetForm()
      await fetchDonors()
      return true
    } catch (err) {
      if (err?.response?.status === 422) {
        const { message, errors: fieldErrors } = extractValidationErrors(err, 'Validation error.')
        formError.value = message
        errors.value = fieldErrors
      } else {
        formError.value = messageFromError(err, 'Failed to save donation history.')
      }
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteHistory(id) {
    if (!id) return
    deletingId.value = id
    formError.value = ''
    errors.value = {}

    try {
      await apiClient.delete(`/blood-donor/me/histories/${id}`)
      if (selectedUser.value?.id) await fetchHistories(selectedUser.value.id)
      if (editId.value === id) resetForm()
      await fetchDonors()
    } catch (err) {
      formError.value = messageFromError(err, 'Failed to delete donation history.')
    } finally {
      deletingId.value = null
    }
  }

  return {
    // list
    donors,
    meta,
    loading,
    error,
    filters,
    queryParams,
    fetchDonors,
    setPage,
    resetFilters,

    // modal + histories
    modalOpen,
    modalMode,
    saving,
    deletingId,
    formError,
    errors,
    selectedUser,
    histories,
    loadingHistories,
    historiesError,
    form,
    editId,

    openModalForUser,
    closeModal,
    resetForm,
    calcAvailableFrom,
    setLastDonationDate,
    fetchHistories,
    editHistory,
    saveHistory,
    deleteHistory,
  }
})
