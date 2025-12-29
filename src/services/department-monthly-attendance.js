import apiClient from '@/axios'

export const fetchDepartmentMonthlyAttendance = (params) => {
  return apiClient.get('/attendance/department-monthly-summary', { params })
}

export const exportDepartmentMonthlyAttendance = (params) => {
  return apiClient.get('/attendance/department-monthly-summary/export', {
    params,
    responseType: 'blob',
  })
}
