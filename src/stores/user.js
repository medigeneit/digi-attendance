import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref([])
  const userLeaveBalance = ref([])
  const userLeaveTypes = ref([])
  const handoverUsers = ref([])
  const user = ref({})
  const userDashboard = ref({})
  const dashboardInfo = ref({})
  const error = ref(null)
  const isLoading = ref(false) // লোডিং স্টেট
  const selectedDate = ref(new Date().toISOString().substring(0, 10))

  // Getters
  const allUsers = computed(() => users.value)
  const singleUser = computed(() => user.value)
  const errorMessage = computed(() => error.value)

  // Actions
  const fetchUsers = async ( params = {}) => {
    try {

      isLoading.value = true // লোডিং শুরু
      const response = await apiClient.get(`/users`, {params})

      users.value = response.data
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false // লোডিং শেষ
    }
  }

  const fetchUsersExcelExport = async (payload) => {
    try {
      isLoading.value = true
      const response = await apiClient.get('/users', {
        params: {
          flag: 'excel',
          company_id: payload.data.company_id,
          department_id: payload.data.department_id,
          line_type: payload.data.line_type,
          status: payload.data.status,
        },
        responseType: 'blob', // This is important for file download
      })

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'users.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()

      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false
    }
  }

  const fetchTypeWiseEmployees = async (params = {}) => {
    try {
      isLoading.value = true // লোডিং শুরু
      const response = await apiClient.get('/type-wise-employees', { params })
      users.value = response.data
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false // লোডিং শেষ
    }
  }

  const fetchDepartmentWiseEmployees = async () => {
    try {
      isLoading.value = true // লোডিং শুরু
      const response = await apiClient.get('/department-wise-employees')
      users.value = response.data
      error.value = null
      return users.value
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false // লোডিং শেষ
    }
  }

  const fetchHandoverDepartmentWiseEmployees = async () => {
    try {
      isLoading.value = true // লোডিং শুরু
      const response = await apiClient.get('/department-handover-wise-employees')
      handoverUsers.value = response.data
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false // লোডিং শেষ
    }
  }

  const fetchUser = async (id) => {
    try {
      isLoading.value = true
      const response = await apiClient.get(`/users/${id}`)
      const data = response.data
      if (data) {
        user.value = data
      }
      error.value = null
      return data
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false
    }
  }

  const fetchUserWeekends = async (id) => {
    try {
      const res = await apiClient.get(`/employee/weekends/${id}`)
      return res?.data ?? res
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } 
  }

  const fetchUserShifts = async (id) => {
    try {
      const res = await apiClient.get(`/employee/${id}/shift-history`)
      return res?.data ?? res
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } 
  }

  const fetchUserDashboardData = async () => {
    try {
      isLoading.value = true
      const response = await apiClient.get('/dashboard')
      const data = response.data
      if (data) {
        userDashboard.value = data
      }
      error.value = null
      return data
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false
    }
  }
  const fetchAdminDashboardData = async () => {
    try {
      isLoading.value = true
      const response = await apiClient.get('/admin-dashboard')
      const data = response.data
      if (data) {
        dashboardInfo.value = data
      }
      error.value = null
      return data
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false
    }
  }

  const createUser = async (payload) => {
    try {
      isLoading.value = true
      const response = await apiClient.post('/users', payload)
      users.value.push(response.data.user)
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false
    }
  }

  const updateUser = async (id, payload) => {
    try {
      isLoading.value = true
      const response = await apiClient.put(`/users/${id}`, payload)
      const index = users.value.findIndex((u) => u.id === id)
      if (index !== -1) {
        users.value[index] = response.data.user
      }
      error.value = null
      return response.data.user
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false
    }
  }

  const deleteUser = async (id) => {
    try {
      isLoading.value = true
      await apiClient.delete(`/users/${id}`)
      users.value = users.value.filter((u) => u.id !== id)
      error.value = null
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false
    }
  }

   const saveLeaveBalances = async(userId, balances) => {
      try {
        isLoading.value = true
        const response = await apiClient.post(`/leave-balances/${userId}`, { balances })
        return response.data
      } catch (error) {
        console.error('Failed to save leave balances:', error)
        throw error
      } finally {
        isLoading .value= false
      }
    }

    const fetchUserLeaveTypes = async(userId) => {
      try {
        const res = await apiClient.get(`/leave-balances/${userId}`)
        userLeaveTypes.value = res.data
        return res.data;
      } catch (err) {
        console.error('Failed to fetch balances', err)
      }
    }

    const fetchUserLeaveBalances = async(userId, opts = null) => {
      try {
        const params = {}
        if (opts?.type) params.type = opts.type
        if (opts?.applicationId) params.context_application_id = opts.applicationId

        const res = await apiClient.get(`/user-leave-balance/${userId}` , { params })
        userLeaveBalance.value = res.data
        return res.data;
      } catch (err) {
        console.error('Failed to fetch balances', err)
      }
    }

    const updateOrCreateWeekend = async(userId, weekendData) => {
      try {
        const response = await apiClient.post(`/employee/weekend/update-or-create/${userId}`, {
          selected_weekend: weekendData,
        });
       fetchUsers()
        return response.data.message;
      } catch (error) {
        throw new Error(error.response?.data?.message || error.message);
      }
    }

  // Return state, getters, and actions
  return {
    users,
    handoverUsers,
    user,
    error,
    isLoading, // লোডিং স্টেট রিটার্ন করা
    allUsers,
    userLeaveTypes,
    userLeaveBalance,
    singleUser,
    errorMessage,
    dashboardInfo,
    userDashboard,
    selectedDate,
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    deleteUser,
    fetchUserDashboardData,
    fetchAdminDashboardData,
    fetchTypeWiseEmployees,
    fetchDepartmentWiseEmployees,
    fetchHandoverDepartmentWiseEmployees,
    fetchUsersExcelExport,
    saveLeaveBalances,
    fetchUserLeaveBalances,
    fetchUserLeaveTypes,
    updateOrCreateWeekend,
    fetchUserWeekends,
    fetchUserShifts
  }
})
