import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../axios';

export const useShiftScheduleStore = defineStore('shiftSchedule', () => {
  const schedules = ref([]);

  const fetchSchedules = async (payload) => {
    const res = await apiClient.get('/shift-schedules', payload);
    schedules.value = res?.data;
    return res.data;
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
    fetchSchedules,
    saveSchedules,
    fetchDefaultSchedules
  };
});