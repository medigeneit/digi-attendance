import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '../axios'

const FLOW_LABELS = {
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
}

const STATUS_OPTIONS = {
  onboarding: [
    { value: 'pre_boarding', label: 'Pre-Boarding' },
    { value: 'joining', label: 'Joining Checklist' },
    { value: 'training', label: 'Training & Resource Setup' },
    { value: 'probation', label: 'Probation Tracking' },
    { value: 'confirmation', label: 'Confirmation / Regularization' },
  ],
  offboarding: [
    { value: 'exit_request', label: 'Exit Request' },
    { value: 'clearance_in_progress', label: 'Exit Checklist / Clearance' },
    { value: 'handover_in_progress', label: 'Handover' },
    { value: 'exit_interview', label: 'Exit Interview / Feedback' },
    { value: 'settlement_pending', label: 'Final Settlement' },
    { value: 'exited', label: 'Close Exit' },
  ],
}

const normalizeFlowType = (value) => (value === 'offboarding' ? 'offboarding' : 'onboarding')

export const useLifecycleStore = defineStore('lifecycle', () => {
  const loading = ref(false)
  const detailLoading = ref(false)
  const error = ref(null)
  const detailError = ref(null)

  const flowType = ref('onboarding')
  const userType = ref('Probationary')
  const companyId = ref(null)
  const departmentId = ref(null)
  const employeeId = ref(null)
  const lineType = ref(null)
  const search = ref('')
  const lifecycleStatus = ref(null)

  const rows = ref([])
  const currentRecord = ref(null)
  const meta = ref(null)

  const flowLabel = computed(() => FLOW_LABELS[flowType.value] || FLOW_LABELS.onboarding)
  const lifecycleStatusOptions = computed(() => STATUS_OPTIONS[flowType.value] || [])

  function setFlowType(nextValue) {
    flowType.value = normalizeFlowType(nextValue)

    const isValid = lifecycleStatusOptions.value.some((item) => item.value === lifecycleStatus.value)
    if (!isValid) lifecycleStatus.value = null
  }

  function buildParams(extra = {}) {
    const params = {
      flow_type: flowType.value,
      user_type: userType.value || undefined,
      company_id: companyId.value || undefined,
      department_id: departmentId.value || undefined,
      employee_id: employeeId.value || undefined,
      line_type: lineType.value || undefined,
      search: (search.value || '').trim() || undefined,
      lifecycle_status: lifecycleStatus.value || undefined,
      ...extra,
    }

    Object.keys(params).forEach((key) => {
      if (params[key] == null || params[key] === '') delete params[key]
    })

    return params
  }

  async function fetchBoard(extra = {}) {
    loading.value = true
    error.value = null

    try {
      const { data } = await apiClient.get('/lifecycles', { params: buildParams(extra) })
      rows.value = Array.isArray(data?.data) ? data.data : []
      meta.value = data?.meta ?? null
    } catch (err) {
      rows.value = []
      meta.value = null
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(userId, nextFlowType = flowType.value) {
    detailLoading.value = true
    detailError.value = null
    setFlowType(nextFlowType)

    try {
      const { data } = await apiClient.get(`/lifecycles/${flowType.value}/users/${Number(userId)}`)
      currentRecord.value = data?.data ?? null
      return currentRecord.value
    } catch (err) {
      currentRecord.value = null
      detailError.value = err
      throw err
    } finally {
      detailLoading.value = false
    }
  }

  async function saveStageRecord(lifecycleId, stageCode, payload) {
    detailError.value = null

    try {
      const { data } = await apiClient.patch(`/lifecycles/${Number(lifecycleId)}/stages/${stageCode}`, payload)
      currentRecord.value = data?.data ?? null
      return currentRecord.value
    } catch (err) {
      detailError.value = err
      throw err
    }
  }

  async function uploadDocument(file) {
    const form = new FormData()
    form.append('file', file)

    const { data } = await apiClient.post('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return data?.data
  }

  function resetDetail() {
    currentRecord.value = null
    detailError.value = null
  }

  return {
    loading,
    detailLoading,
    error,
    detailError,
    flowType,
    flowLabel,
    userType,
    companyId,
    departmentId,
    employeeId,
    lineType,
    search,
    lifecycleStatus,
    lifecycleStatusOptions,
    rows,
    currentRecord,
    meta,
    setFlowType,
    fetchBoard,
    fetchDetail,
    saveStageRecord,
    uploadDocument,
    resetDetail,
  }
})
