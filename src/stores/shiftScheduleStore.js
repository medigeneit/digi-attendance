import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../axios';

export const useShiftScheduleStore = defineStore('shiftSchedule', () => {
  const schedules = ref([]);
  const defaultShift = ref(false)

  const fetchSchedules = async (payload) => {
    const res = await apiClient.get('/shift-schedules', payload);
    schedules.value = res?.data?.schedules;
    defaultShift.value = res?.data?.default_shift
    return res.data?.schedules;
  };

  const fetchDefaultSchedules = async (payload) => {
    const res = await apiClient.get('/default-shift-schedules', payload);
    schedules.value = res?.data;
    return res.data;
  };

  const saveSchedules = async (schedulePayload) => {
    
    await apiClient.post('/shift-schedules', { schedules: schedulePayload?.payload });
  };


  return {
    schedules,
    defaultShift,
    fetchSchedules,
    saveSchedules,
    fetchDefaultSchedules
  };
});