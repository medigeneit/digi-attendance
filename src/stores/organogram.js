import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

const STORAGE_KEY = 'organogram_filters_v1'

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const toNumberOrNull = (value) => {
  const num = Number(value)
  if (Number.isFinite(num) && num > 0) {
    return num
  }
  return null
}

const normalizeFilters = (next) => {
  const cycle = next.cycle_slug === 'support_staff' ? 'support_staff' : 'executives'
  return {
    company_id: toNumberOrNull(next.company_id),
    cycle_slug: cycle,
    department_id: toNumberOrNull(next.department_id),
  }
}

export const useOrganogramStore = defineStore('organogram', () => {
  // State
  const filters = ref(normalizeFilters({ cycle_slug: 'executives' }))
  const departments = ref([])
  const loading = ref(false)
  const error = ref(null)

  const companies = ref([])
  const companiesLoading = ref(false)
  const companiesError = ref(null)
  const companiesAvailable = ref(true)

  const exporting = ref(false)

  // Getters
  const currentFilters = computed(() => filters.value)
  const organogramDepartments = computed(() => departments.value)
  const isLoading = computed(() => loading.value)
  const errorMessage = computed(() => error.value)
  const allCompanies = computed(() => companies.value)

  // Actions
  const setFilters = (patch, { persist = true } = {}) => {
    const merged = { ...filters.value, ...patch }
    filters.value = normalizeFilters(merged)
    if (persist) {
      persistFilters()
    }
  }

  const persistFilters = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters.value))
  }

  const hydrateFilters = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      setFilters(parsed, { persist: false })
    } catch (err) {
      console.warn('Failed to parse organogram filters:', err)
    }
  }

  const fetchCompanies = async () => {
    companiesLoading.value = true
    companiesError.value = null
    companiesAvailable.value = true
    companies.value = []

    const fetchFrom = async (endpoint) => {
      try {
        const response = await apiClient.get(endpoint)
        const list = normalizeList(response.data)
        if (list.length > 0) {
          companies.value = list
          return { ok: true, hasData: true }
        }
        return { ok: true, hasData: false }
      } catch (err) {
        return { ok: false, error: err }
      }
    }

    try {
      const primary = await fetchFrom('/companies')
      if (primary.ok && primary.hasData) return

      const secondary = await fetchFrom('/hrm/companies')
      if (secondary.ok && secondary.hasData) return

      companiesAvailable.value = false
      companiesError.value = 'No companies available. Enter a company id.'
    } catch (err) {
      companiesAvailable.value = false
      companiesError.value = err.response?.data?.message || 'Unable to load companies from the server.'
    } finally {
      companiesLoading.value = false
    }
  }

  const fetchOrganogram = async () => {
    if (!filters.value.company_id) {
      departments.value = []
      error.value = 'Select a company to load organogram data.'
      return
    }

    loading.value = true
    error.value = null
    try {
      const params = {
        company_id: filters.value.company_id,
        cycle_slug: filters.value.cycle_slug,
      }
      if (filters.value.department_id) {
        params.department_id = filters.value.department_id
      }

      const response = await apiClient.get('/hrm/organograms', { params })
      departments.value =
        response.data?.departments ||
        response.data?.data?.departments ||
        []
    } catch (err) {
      departments.value = []
      error.value = err.response?.data?.message || 'Failed to load organogram data.'
    } finally {
      loading.value = false
    }
  }

  const exportExcel = async () => {
    if (!filters.value.company_id) {
      error.value = 'Select a company before exporting.'
      return false
    }

    exporting.value = true
    try {
      const params = {
        company_id: filters.value.company_id,
        cycle_slug: filters.value.cycle_slug,
      }
      if (filters.value.department_id) {
        params.department_id = filters.value.department_id
      }

      const response = await apiClient.get('/hrm/organograms/export', {
        params,
        responseType: 'blob',
      })

      const contentDisposition = response.headers['content-disposition'] || ''
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)|filename="?([^";]+)"?/i)
      const resolvedName = decodeURIComponent(filenameMatch?.[1] || filenameMatch?.[2] || 'organogram.xlsx')

      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resolvedName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      return true
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to export organogram.'
      return false
    } finally {
      exporting.value = false
    }
  }

  return {
    filters: currentFilters,
    departments: organogramDepartments,
    loading: isLoading,
    error: errorMessage,
    companies: allCompanies,
    companiesLoading: computed(() => companiesLoading.value),
    companiesError: computed(() => companiesError.value),
    companiesAvailable: computed(() => companiesAvailable.value),
    exporting: computed(() => exporting.value),
    setFilters,
    hydrateFilters,
    fetchCompanies,
    fetchOrganogram,
    exportExcel,
  }
})
