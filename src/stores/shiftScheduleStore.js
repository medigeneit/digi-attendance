import axios from 'axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useShiftScheduleStore = defineStore('shiftSchedule', () => {
  const schedules = ref([]);
  const fetchSchedules = async (employeeId, month) => {
    const res = await axios.get('/api/shift-schedules', {
      params: { employee_id: employeeId, month }
    });
    schedules.value = res.data;
  };

  const saveSchedules = async (schedulePayload) => {
    await axios.post('/api/shift-schedules', { schedules: schedulePayload?.payload });
  };


  return {
    schedules,
    fetchSchedules,
    saveSchedules,
  };
});