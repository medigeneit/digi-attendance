import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

export const useAttendanceStore = defineStore('attendance', () => {
  const monthlyLogs = ref([])
  const attendanceLogs = ref([])
  const dailyLogs = ref([])
  const dailyLateLogs = ref([])
  const monthlyLateLogs = ref([])
  const summary = ref(null)
  const monthly_company_summary = ref(null)
  const selectedMonth = ref(new Date().toISOString().substring(0, 7))
  const selectedDate = ref(new Date().toISOString().substring(0, 10))
  const error = ref(null)
  const isLoading = ref(false)

  const getUserDailyLogsByDate = async (_userId, date) => {
    const formattedDate = formatDateToDayMonthYear(date)

    return monthlyLogs.value.find((log) => log.date === formattedDate)
  }

  const formatDateToDayMonthYear = (date) => {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short' })
    const year = d.getFullYear()
    return `${day} ${month} ${year}`
  }

  const getMonthlyAttendanceLog = async (userId, month) => {
    if (!userId || !month) {
      error.value = 'Invalid user ID or month'
      return
    }

    isLoading.value = true
    try {
      const response = await apiClient.get(`/user/${userId}/attendance/monthly/${month}/log`)
      attendanceLogs.value = response.data.attendance_logs
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  const getDateRangeAttendanceSummary = async (startDate, endDate, companyId, line_type, userId, ignorePermission = false) => {
    if (!companyId || !startDate || !endDate) {
      error.value = 'Company, Start Date, and End Date are required'
      return
    }

    isLoading.value = true

    try {
      const response = await apiClient.get(`/attendance/date-range-summary`, {
        params: {
          company_id: companyId,
          line_type: line_type || 'all',
          start_date: startDate,
          end_date: endDate,
          employee_id: userId || undefined,
          ignore_permission: ignorePermission ? 'true' : 'false',
        },
      })

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 👉 EXCEL DOWNLOAD
  const downloadDateRangeExcel = async (
    startDate,
    endDate,
    companyId,
    line_type = 'all',
    userId = null,
  ) => {
    if (!companyId || !startDate || !endDate) {
      error.value = 'Company, Start Date, and End Date are required'
      return
    }

    // Get baseURL from apiClient config
    const baseURL = apiClient.defaults.baseURL?.replace(/\/$/, '') // remove trailing slash if exists

    let query = `flag=excel&company_id=${companyId}&start_date=${startDate}&end_date=${endDate}`

    if (userId) query += `&employee_id=${userId}`
    if (line_type) query += `&line_type=${line_type}`

    const fullUrl = `${baseURL}/attendance/date-range-summary?${query}`

    console.log('📁 Opening Excel Download URL:', fullUrl)

    window.open(fullUrl, '_blank')
  }

  // 👉 PDF DOWNLOAD
  const downloadDateRangePdf = (startDate, endDate, companyId , line_type,  userId = null, category = '') => {
    if (!companyId || !startDate || !endDate) {
      error.value = 'Company, Start Date, and End Date are required'
      return
    }

    const params = new URLSearchParams({
      flag: 'pdf',
      company_id: companyId,
      line_type: line_type,
      start_date: startDate,
      end_date: endDate,
    })

    if (userId) params.append('employee_id', userId)
    if (category) params.append('category', category)

    const url = `/attendance/date-range-summary?${params.toString()}`
    window.open(url, '_blank')
  }

  const getMonthlyAttendanceByShift = async (userId, month) => {
    if (!userId || !month) {
      error.value = 'Invalid user ID or month'
      return
    }

    isLoading.value = true
    try {
      const response = await apiClient.get(`/user/${userId}/attendance/monthly/${month}`)
      monthlyLogs.value = response.data.monthly_logs // শুধু logs
      summary.value = response.data.summary // শুধু summary
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  const getTodayAttendanceReport = async (filter = {}) => {
    isLoading.value = true

    try {
      const response = await apiClient.get('/attendance/today', {
        params: filter,
      })

      dailyLogs.value = response.data
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error('[Attendance Error]', error.value)
    } finally {
      isLoading.value = false
    }
  }


  const getAttendanceLateReport = async (
    company_id,
    department_id = null,
    category = null,
    employee_id = null,
    value,
    type,
  ) => {
    isLoading.value = true
    try {
      const params = {
        company_id,
        department_id,
        category, // eg: "executive"
        employee_id, // eg: 5
        type, // 'daily'
        ...(type === 'daily' ? { date: value } : { month: value }),
      }

      const response = await apiClient.get('/monthly/attendance/late-reports', { params })

      if (type === 'daily') {
        dailyLateLogs.value = response.data
      } else if (type === 'monthly') {
        monthlyLateLogs.value = response.data
      }

      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  const getDailyLateReport = async (
    company_id,
    department_id = null,
    line_type = null,
    employee_id = null,
    value,
    type,
  ) => {
    isLoading.value = true
    try {
      const params = {
        company_id,
        department_id,
        line_type, // eg: "executive"
        employee_id, // eg: 5
        type, // 'daily'
        ...(type === 'daily' ? { date: value } : { month: value }),
      }

      const response = await apiClient.get('/attendance/late-reports', { params })

      if (type === 'daily') {
        dailyLateLogs.value = response.data
      } else if (type === 'monthly') {
        monthlyLateLogs.value = response.data
      }

      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  const getMonthlyAttendanceSummaryReport = async (company_id, department_id, line_type, employee_id, month) => {
    if (!company_id || !month) {
      error.value = 'Company & month are required'
      return
    }

    isLoading.value = true

    try {
      const params = {
        company_id,
        department_id,
        month,
        line_type: line_type || '',
        employee_id: employee_id || '',
      }

      const response = await apiClient.get('/attendance/monthly-summary-reports', {
        params,
      })

      // যদি API resource style হয় -> { data: [...] }
      // না হলে সরাসরি array হলেও handle হবে
      monthly_company_summary.value = response.data?.data ?? response.data
      error.value = null
    } catch (err) {
      error.value = err?.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }


  const cleanPayload = (obj) => {
    const cleaned = {}
    Object.entries(obj).forEach(([k, v]) => {
      // drop undefined/null and also drop '' to avoid "lost" meaning on backend
      if (v === undefined || v === null || v === '') return
      cleaned[k] = v
    })
    return cleaned
  }

  const requireFields = (company_id, month) => {
    if (!company_id || !month) {
      const msg = 'Company & month are required'
      error.value = msg
      throw new Error(msg)
    }
  }

  const handleApiError = (err, fallback = 'Something went wrong') => {
    const msg = err?.response?.data?.message || err?.message || fallback
    error.value = msg
    console.error(msg, err)
    throw err
  }

  const recalculateMonthlySnapshot = async (
    company_id,
    department_id,
    line_type,
    employee_id,
    month,
  ) => {
    requireFields(company_id, month)

    isLoading.value = true
    error.value = null

    try {
      const payload = cleanPayload({
        company_id,
        month,
        department_id: department_id || undefined,
        employee_id: employee_id || undefined,
        // ✅ omit when "all" or falsy instead of sending ''
        line_type: line_type && line_type !== 'all' ? line_type : undefined,
      })

      const res = await apiClient.post('/attendance/monthly-snapshot/recalculate', payload)
      return res.data
    } catch (err) {
      handleApiError(err, 'Failed to recalculate monthly snapshot')
    } finally {
      isLoading.value = false
    }
  }

  const finalizeMonthlySnapshot = async (
    company_id,
    line_type,
    employee_id,
    month,
    action = 'finalize',
  ) => {
    requireFields(company_id, month)

    isLoading.value = true
    error.value = null

    try {
      const payload = cleanPayload({
        company_id,
        month,
        action, // 'finalize' | 'unfinalize'
        employee_id: employee_id || undefined,
        line_type: line_type && line_type !== 'all' ? line_type : undefined,
      })

      const res = await apiClient.post('/attendance/monthly-snapshot/finalize', payload)
      return res.data
    } catch (err) {
      handleApiError(err, 'Failed to finalize monthly snapshot')
    } finally {
      isLoading.value = false
    }
  }


  const downloadPDF = async (company_id, category, month, _flag = 0) => {
    if (!company_id || !month) {
      error.value = 'Invalid user ID or month'
      return
    }

    isLoading.value = true

    try {
      const params = { company_id, category, month }
      const response = await apiClient.get(`/attendance/monthly-summary-reports?flag=pdf`, {
        params,
        responseType: 'blob', // Important for file downloads
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${month} attendance_summary.pdf`) // File name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  const attendanceDownloadPdf = async (companyId, employee_id, category, month, status) => {
    isLoading.value = true
    try {
      const params = { companyId, employee_id, category, month, status }
      const response = await apiClient.get(`/attendance/today?flag=pdf`, {
        params,
        responseType: 'blob', // Important for file downloads
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${month} attendance_summary.pdf`) // File name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  const downloadExcel = async (company_id, line_type, month) => {
    if (!company_id || !month) {
      error.value = 'Invalid company ID or month'
      return
    }
    isLoading.value = true

    try {
      const params = { company_id, line_type, month }

      const response = await apiClient.get(`/attendance/monthly-summary-reports?flag=excel`, {
        params,
        responseType: 'blob', // Important for file downloads
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${month} attendance_summary.xlsx`) // File name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  const attendanceDownloadExcel = async (companyId, employee_id, line_type, month, status) => {
    isLoading.value = true
    try {
      const params = { companyId, employee_id, line_type, month, status }
      const response = await apiClient.get(`/attendance/today?flag=excel`, {
        params,
        responseType: 'blob', // Important for file downloads
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${month} attendance_summary.xlsx`) // File name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  const lateReportDownloadExcel = async (company_id, employee_id, value, type) => {
    if (!company_id) {
      error.value = 'Invalid company ID or date/month'
      return
    }

    isLoading.value = true

    try {
      const params = {
        company_id,
        ...(employee_id ? { employee_id } : {}), // only include if present
        type,
        ...(type === 'daily' ? { date: value } : { month: value }),
      }

      const response = await apiClient.get(`/monthly/attendance/late-reports?flag=excel`, {
        params,
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url

      // File name should reflect type
      const filename = `${type === 'daily' ? value : value}-late-attendance.xlsx`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
      console.error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  return {
    monthlyLogs,
    dailyLateLogs,
    monthlyLateLogs,
    summary,
    monthly_company_summary,
    selectedMonth,
    selectedDate,
    error,
    isLoading,
    dailyLogs,
    attendanceLogs,
    getUserDailyLogsByDate,
    getMonthlyAttendanceByShift,
    getTodayAttendanceReport,
    getAttendanceLateReport,
    getMonthlyAttendanceSummaryReport,
    downloadExcel,
    downloadPDF,
    attendanceDownloadExcel,
    attendanceDownloadPdf,
    lateReportDownloadExcel,
    getMonthlyAttendanceLog,
    getDateRangeAttendanceSummary,
    downloadDateRangeExcel,
    downloadDateRangePdf,
    getDailyLateReport,
    recalculateMonthlySnapshot,
    finalizeMonthlySnapshot,
  }
})
