import { reactive, computed } from 'vue';
import apiClient from '../axios';

export function useAttendanceStore() {
  const state = reactive({
    attendances: [], // List of attendance records
    monthlyAttendance: null, // Monthly attendance for a specific user
    error: null, // Error state
  });

  const attendances = computed(() => state.attendances);
  const monthlyAttendance = computed(() => state.monthlyAttendance);
  const error = computed(() => state.error);

  // Fetch Monthly Attendance by Shift
  const getMonthlyAttendanceByShift = async (userId, month) => {
    try {
      const response = await apiClient.get(`/user/${userId}/attendance/monthly/${month}`);
      state.monthlyAttendance = response.data;
      state.error = null;
      return response.data;
    } catch (err) {
      state.error = err.response?.data?.message || 'Something went wrong';
      console.error(state.error);
    }
  };

  return {
    attendances,
    monthlyAttendance,
    error,
    getMonthlyAttendanceByShift,
  };
}
