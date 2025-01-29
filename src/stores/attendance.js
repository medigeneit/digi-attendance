import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../axios';

export const useAttendanceStore = defineStore('attendance', () => {
  const monthlyLogs = ref([]);
  const dailyLogs = ref([]);
  const summary = ref(null);
  const selectedMonth = ref(new Date().toISOString().substring(0, 7));
  const selectedDate = ref(new Date().toISOString().substring(0, 10));
  const error = ref(null);
  const isLoading = ref(false);

  const getMonthlyAttendanceByShift = async (userId, month) => {
    if (!userId || !month) {
      error.value = 'Invalid user ID or month';
      return;
    }
    isLoading.value = true;
    try {
      const response = await apiClient.get(`/user/${userId}/attendance/monthly/${month}`);
      monthlyLogs.value = response.data.monthly_logs; // শুধু logs
      summary.value = response.data.summary; // শুধু summary
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  };
  const getTodayAttendanceReport = async (companyId, month) => {
    isLoading.value = true;
    try {
      const params = {companyId, month}
      const response = await apiClient.get("/attendance/today", { params });
      dailyLogs.value = response.data; 
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    monthlyLogs,
    summary,
    selectedMonth,
    selectedDate,
    error,
    isLoading,
    dailyLogs,
    getMonthlyAttendanceByShift,
    getTodayAttendanceReport
  };
});

