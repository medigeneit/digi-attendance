import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '@/axios';

export const useLeaveApprovalStore = defineStore('leaveApproval', () => {
  const leaveApprovals = ref([]);
  const leaveApproval = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchLeaveApprovals = async (params = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/leave-approvals', { params });
      leaveApprovals.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch leave approvals.';
      console.error('Error fetching leave approvals:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchLeaveApproval = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/leave-approvals/${id}`);
      leaveApproval.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to fetch leave approval with ID: ${id}.`;
      console.error(`Error fetching leave approval with ID ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const createLeaveApproval = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/leave-approvals', data);
      await fetchLeaveApprovals(); // Refresh the list
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create leave approval.';
      console.error('Error creating leave approval:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateLeaveApproval = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/leave-approvals/${id}`, data);
      await fetchLeaveApprovals(); // Refresh the list
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update leave approval with ID: ${id}.`;
      console.error(`Error updating leave approval with ID ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteLeaveApproval = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/leave-approvals/${id}`);
      leaveApprovals.value = leaveApprovals.value.filter((approval) => approval.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to delete leave approval with ID: ${id}.`;
      console.error(`Error deleting leave approval with ID ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    leaveApprovals: computed(() => leaveApprovals.value),
    leaveApproval: computed(() => leaveApproval.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchLeaveApprovals,
    fetchLeaveApproval,
    createLeaveApproval,
    updateLeaveApproval,
    deleteLeaveApproval,
  };
});
