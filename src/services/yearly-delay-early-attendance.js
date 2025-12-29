import apiClient from '@/axios'

export const fetchYearlyDealyEarlyAttendanceSummary = (params) => {
  return apiClient.get('/attendance/yearly-delay-early-summary', { params })
}

export const exportYearlyDealyEarlyAttendanceSummary = (params) => {
  return apiClient.get('/attendance/yearly-delay-early-summary/export', {
    params,
    responseType: 'blob',
  })
}
