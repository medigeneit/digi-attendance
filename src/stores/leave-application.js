import { ref } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '@/axios'; // Assuming axios is configured in '@/axios'

export const useLeaveApplicationStore = defineStore('leaveApplication', () => {
  // State
  const leaveApplications = ref([]);
  const leaveApplication = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Actions
  async function fetchLeaveApplications(filters = {}) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/leave-applications', { params: filters });
      leaveApplications.value = response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch leave applications';
    } finally {
      loading.value = false;
    }
  }

  async function storeLeaveApplication(payload) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/leave-applications/store', payload);
      leaveApplications.value.push(response.data.data);
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to store leave application';
      throw new Error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function updateLeaveApplication(id, payload) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post(`/leave-applications/${id}/update`, payload);
      const index = leaveApplications.value.findIndex((app) => app.id === id);
      if (index !== -1) {
        leaveApplications.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update leave application';
      throw new Error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function fetchLeaveApplicationById(id) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/leave-applications/${id}`);
      leaveApplication.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch leave application';
    } finally {
      loading.value = false;
    }
  }

  return {
    leaveApplications,
    leaveApplication,
    loading,
    error,
    fetchLeaveApplications,
    storeLeaveApplication,
    updateLeaveApplication,
    fetchLeaveApplicationById,
  };
});
