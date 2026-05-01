import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/axios'

export const useDashboardStore = defineStore('dashboard', () => {
  const kpi = ref(null)
  const donut = ref(null)
  const trend = ref(null)
  const lateAnalysis = ref(null)
  const topLate = ref([])
  const insights = ref([])
  const drillEmployees = ref([])
  const deptLateDetail = ref(null)

  const summary = ref(null)
  const deptOverview = ref(null)
  const typeDistribution = ref(null)
  const requests = ref([])
  const meta = ref(null)

  const error = ref(null)

  const loading = ref({
    kpi: false,
    donut: false,
    trend: false,
    lateAnalysis: false,
    topLate: false,
    insights: false,
    employees: false,
    deptLateDetail: false,
    summary: false,
    deptOverview: false,
    typeDistribution: false,
    requests: false,
    approve: false,
    reject: false,
    bulkAction: false,
    export: false,
  })

  const params = ref({
    department_id: '',
    date: '',
  })

  const filters = ref({
    month: '',
    department_id: '',
    leave_type: '',
    status: '',
    search: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
    per_page: 10,
    page: 1,
  })

  const selectedIds = ref(new Set())

  const hasSelected = computed(() => selectedIds.value.size > 0)

  const normalizeParams = (payload = {}) => {
    const cleaned = {}

    Object.entries(payload).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) return
      cleaned[key] = value
    })

    return cleaned
  }

  const handleError = (err, fallback = 'Something went wrong') => {
    error.value = err?.response?.data?.message || fallback
    throw err
  }

  const attendanceParams = (extra = {}) =>
    normalizeParams({
      department_id: params.value.department_id,
      date: params.value.date,
      ...extra,
    })

  const leaveParams = (extra = {}) =>
    normalizeParams({
      month: filters.value.month,
      department_id: filters.value.department_id,
      leave_type: filters.value.leave_type,
      status: filters.value.status,
      search: filters.value.search,
      sort_by: filters.value.sort_by,
      sort_dir: filters.value.sort_dir,
      per_page: filters.value.per_page,
      page: filters.value.page,
      ...extra,
    })

  async function fetchKpi() {
    loading.value.kpi = true
    try {
      const { data } = await apiClient.get('/dashboard/kpi', {
        params: attendanceParams(),
      })
      kpi.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load KPI data')
    } finally {
      loading.value.kpi = false
    }
  }

  async function fetchDonut() {
    loading.value.donut = true
    try {
      const { data } = await apiClient.get('/dashboard/donut', {
        params: attendanceParams(),
      })
      donut.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load donut chart')
    } finally {
      loading.value.donut = false
    }
  }

  async function fetchTrend(range = 'week') {
    loading.value.trend = true
    try {
      const { data } = await apiClient.get('/dashboard/trend', {
        params: attendanceParams({ range }),
      })
      trend.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load trend data')
    } finally {
      loading.value.trend = false
    }
  }

  async function fetchLateAnalysis() {
    loading.value.lateAnalysis = true
    try {
      const { data } = await apiClient.get('/dashboard/late-analysis', {
        params: attendanceParams(),
      })
      lateAnalysis.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load late analysis')
    } finally {
      loading.value.lateAnalysis = false
    }
  }

  async function fetchTopLate(limit = 8) {
    loading.value.topLate = true
    try {
      const { data } = await apiClient.get('/dashboard/top-late', {
        params: attendanceParams({ limit }),
      })
      topLate.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load top late employees')
    } finally {
      loading.value.topLate = false
    }
  }

  async function fetchInsights() {
    loading.value.insights = true
    try {
      const { data } = await apiClient.get('/dashboard/insights', {
        params: attendanceParams(),
      })
      insights.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load insights')
    } finally {
      loading.value.insights = false
    }
  }

  async function fetchEmployeesByStatus(status = 'all') {
    loading.value.employees = true
    try {
      const { data } = await apiClient.get('/dashboard/employees', {
        params: attendanceParams({ status }),
      })
      drillEmployees.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load employees')
    } finally {
      loading.value.employees = false
    }
  }

  async function fetchDeptLateDetail(departmentId) {
    loading.value.deptLateDetail = true
    try {
      const { data } = await apiClient.get(`/dashboard/departments/${departmentId}/late-detail`, {
        params: attendanceParams(),
      })
      deptLateDetail.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load department late detail')
    } finally {
      loading.value.deptLateDetail = false
    }
  }

  async function fetchAttendanceDashboard(range = 'week') {
    await Promise.all([
      fetchKpi(),
      fetchDonut(),
      fetchTrend(range),
      fetchLateAnalysis(),
      fetchTopLate(),
      fetchInsights(),
    ])
  }

  async function fetchSummary() {
    loading.value.summary = true
    try {
      const { data } = await apiClient.get('/leave/summary', {
        params: leaveParams({
          sort_by: undefined,
          sort_dir: undefined,
          per_page: undefined,
          page: undefined,
          search: undefined,
        }),
      })
      summary.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load leave summary')
    } finally {
      loading.value.summary = false
    }
  }

  async function fetchDeptOverview() {
    loading.value.deptOverview = true
    try {
      const { data } = await apiClient.get('/leave/department-overview', {
        params: leaveParams({
          sort_by: undefined,
          sort_dir: undefined,
          per_page: undefined,
          page: undefined,
          search: undefined,
          leave_type: undefined,
          status: undefined,
        }),
      })
      deptOverview.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load department overview')
    } finally {
      loading.value.deptOverview = false
    }
  }

  async function fetchTypeDistribution() {
    loading.value.typeDistribution = true
    try {
      const { data } = await apiClient.get('/leave/type-distribution', {
        params: leaveParams({
          sort_by: undefined,
          sort_dir: undefined,
          per_page: undefined,
          page: undefined,
          search: undefined,
          status: undefined,
        }),
      })
      typeDistribution.value = data
      return data
    } catch (err) {
      handleError(err, 'Failed to load leave type distribution')
    } finally {
      loading.value.typeDistribution = false
    }
  }

  async function fetchRequests(extra = {}) {
    loading.value.requests = true
    try {
      const { data } = await apiClient.get('/leave/requests', {
        params: leaveParams(extra),
      })

      requests.value = data?.data ?? []
      meta.value = data?.meta ?? null

      return data
    } catch (err) {
      handleError(err, 'Failed to load leave requests')
    } finally {
      loading.value.requests = false
    }
  }

  async function approveRequest(id) {
    loading.value.approve = true
    try {
      const { data } = await apiClient.post(`/leave/requests/${id}/approve`)
      await Promise.all([fetchRequests(), fetchSummary(), fetchDeptOverview(), fetchTypeDistribution()])
      return data
    } catch (err) {
      handleError(err, 'Failed to approve leave request')
    } finally {
      loading.value.approve = false
    }
  }

  async function rejectRequest(id, payload = {}) {
    loading.value.reject = true
    try {
      const { data } = await apiClient.post(`/leave/requests/${id}/reject`, payload)
      await Promise.all([fetchRequests(), fetchSummary(), fetchDeptOverview(), fetchTypeDistribution()])
      return data
    } catch (err) {
      handleError(err, 'Failed to reject leave request')
    } finally {
      loading.value.reject = false
    }
  }

  async function bulkAction(action, payload = {}) {
    loading.value.bulkAction = true
    try {
      const ids = Array.from(selectedIds.value)
      const { data } = await apiClient.post('/leave/requests/bulk-action', {
        ids,
        action,
        ...payload,
      })
      selectedIds.value = new Set()
      await Promise.all([fetchRequests(), fetchSummary(), fetchDeptOverview(), fetchTypeDistribution()])
      return data
    } catch (err) {
      handleError(err, 'Failed to run bulk action')
    } finally {
      loading.value.bulkAction = false
    }
  }

  async function exportLeaveRequests() {
    loading.value.export = true
    try {
      const response = await apiClient.get('/leave/export', {
        params: leaveParams({
          sort_by: undefined,
          sort_dir: undefined,
          per_page: undefined,
          page: undefined,
          search: undefined,
        }),
        responseType: 'blob',
      })

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const disposition = response.headers['content-disposition'] || ''
      const matched = disposition.match(/filename="?([^"]+)"?/)
      const filename = matched?.[1] || 'leave_report.csv'

      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      handleError(err, 'Failed to export leave requests')
    } finally {
      loading.value.export = false
    }
  }

  async function fetchLeaveDashboard() {
    await Promise.all([
      fetchSummary(),
      fetchDeptOverview(),
      fetchTypeDistribution(),
      fetchRequests(),
    ])
  }

  async function fetchAll(range = 'week') {
    await Promise.all([
      fetchAttendanceDashboard(range),
      fetchLeaveDashboard(),
    ])
  }

  function toggleSelect(id) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  function toggleSelectAll() {
    const pendingIds = requests.value
      .filter((item) => item.status === 'Pending')
      .map((item) => item.id)

    const next = new Set(selectedIds.value)
    const allSelected = pendingIds.length > 0 && pendingIds.every((id) => next.has(id))

    if (allSelected) {
      pendingIds.forEach((id) => next.delete(id))
    } else {
      pendingIds.forEach((id) => next.add(id))
    }

    selectedIds.value = next
  }

  return {
    kpi,
    donut,
    trend,
    lateAnalysis,
    topLate,
    insights,
    drillEmployees,
    deptLateDetail,
    summary,
    deptOverview,
    typeDistribution,
    requests,
    meta,
    error,
    loading,
    params,
    filters,
    selectedIds,
    hasSelected,
    fetchKpi,
    fetchDonut,
    fetchTrend,
    fetchLateAnalysis,
    fetchTopLate,
    fetchInsights,
    fetchEmployeesByStatus,
    fetchDeptLateDetail,
    fetchAttendanceDashboard,
    fetchSummary,
    fetchDeptOverview,
    fetchTypeDistribution,
    fetchRequests,
    approveRequest,
    rejectRequest,
    bulkAction,
    exportLeaveRequests,
    fetchLeaveDashboard,
    fetchAll,
    toggleSelect,
    clearSelection,
    toggleSelectAll,
  }
})
