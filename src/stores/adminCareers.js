// src/stores/adminCareers.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

export const useAdminCareersStore = defineStore('adminCareers', () => {
  const jobs = ref([])
  const jobsMeta = ref({ page: 1, per_page: 12, total: 0, last_page: 1 })
  const job = ref(null)

  const applications = ref([])
  const appsMeta = ref({ page: 1, per_page: 15, total: 0, last_page: 1 })

  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  /* ---------- actions ---------- */

  // Jobs
  const fetchJobs = async (params = {}) => {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apiClient.get('/careers/jobs', {
        params: { ...params, only_open: undefined }
      })
      jobs.value = data?.data ?? data?.items ?? data ?? []
      const meta = data?.meta || data || {}
      jobsMeta.value = {
        page: meta.current_page ?? 1,
        per_page: meta.per_page ?? params.per_page ?? 12,
        total: meta.total ?? 0,
        last_page: meta.last_page ?? 1
      }
    } catch (e) {
      error.value = 'Failed to load jobs'
    } finally {
      loading.value = false
    }
  }

  const fetchJobById = async (id) => {
    loading.value = true
    error.value = ''
    try {
      // If you add a backend show-by-id, use that.
      const { data } = await apiClient.get('/careers/jobs', { params: { paginate: false } })
      const arr = data?.data ?? data ?? []
      job.value = arr.find(j => String(j.id) === String(id)) || null
      if (!job.value) error.value = 'Job not found in current dataset'
    } catch (e) {
      error.value = 'Failed to fetch job'
    } finally {
      loading.value = false
    }
  }

  const createJob = async (payload) => {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apiClient.post('/careers/jobs', payload)
      return data
    } catch (e) {
      error.value = 'Failed to create job'
      throw e
    } finally {
      saving.value = false
    }
  }

  const updateJob = async (id, payload) => {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apiClient.put(`/careers/jobs/${id}`, payload)
      return data
    } catch (e) {
      error.value = 'Failed to update job'
      throw e
    } finally {
      saving.value = false
    }
  }

  const deleteJob = async (id) => {
    saving.value = true
    error.value = ''
    try {
      await apiClient.delete(`/careers/jobs/${id}`)
    } catch (e) {
      error.value = 'Failed to delete job'
      throw e
    } finally {
      saving.value = false
    }
  }

  // Applications
  const fetchApplications = async (params = {}) => {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apiClient.get('/careers/applications', { params })
      applications.value = data?.data ?? data ?? []
      const meta = data?.meta || data || {}
      appsMeta.value = {
        page: meta.current_page ?? 1,
        per_page: meta.per_page ?? params.per_page ?? 15,
        total: meta.total ?? 0,
        last_page: meta.last_page ?? 1
      }
    } catch (e) {
      error.value = 'Failed to load applications'
    } finally {
      loading.value = false
    }
  }

  const updateApplicationStatus = async (id, { status, rating }) => {
    try {
      const { data } = await apiClient.patch(`/careers/applications/${id}`, { status, rating })
      const i = applications.value.findIndex(a => a.id === id)
      if (i !== -1) applications.value[i] = data
      return data
    } catch (e) {
      error.value = 'Failed to update application'
      throw e
    }
  }

  return {
    // state
    jobs, jobsMeta, job,
    applications, appsMeta,
    loading, saving, error,

    // actions
    fetchJobs,
    fetchJobById,
    createJob,
    updateJob,
    deleteJob,
    fetchApplications,
    updateApplicationStatus
  }
})
