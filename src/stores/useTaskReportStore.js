import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useTaskReportStore = defineStore('task-report', () => {
  const task_reports = ref([]);
  const task_report = ref(null);
  const loading = ref(false);
  const error = ref(null);



  const fetchTaskReports = async (params) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get('/task-reports', {params});
      task_reports.value = response.data.reports;
    } catch (err) {
      error.value = err.response?.data?.message || 'টাস্ক লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching tasks:', err);
    } finally {
      loading.value = false;
    }
  };


  const fetchTaskReport = async (id, params = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/task-reports`, {params});
      task_report.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `টাস্ক (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching task with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const createTaskReport = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/task-reports', data);
      task_reports.value.push(response.data.task_report);
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'টাস্ক তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating task:', err);
      throw err
    } finally {
      loading.value = false;
    }
  };



  return {
    task_reports: computed(() => task_reports.value),
    task_report: computed(() => task_report.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchTaskReports,
    fetchTaskReport,
    createTaskReport
  };
});
