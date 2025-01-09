import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '../axios';

export const useLeaveTypeStore = defineStore('leaveType', () => {
  const leaveTypes = ref([]);
  const leaveType = ref(null);
  const leaveBalance = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchLeaveTypes = async (companyId = null) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/leave-types', {
        params: { company_id: companyId },
      });
      leaveTypes.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'লিভ টাইপ লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching leave types:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchLeaveType = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/leave-types/${id}`);
      leaveType.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `লিভ টাইপ (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching leave type with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };



  const createLeaveType = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/leave-types', data);
      await fetchLeaveTypes();
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'লিভ টাইপ তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating leave type:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateLeaveType = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/leave-types/${id}`, data);
      await fetchLeaveTypes();
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `লিভ টাইপ (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating leave type with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteLeaveType = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/leave-types/${id}`);
      leaveTypes.value = leaveTypes.value.filter((type) => type.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `লিভ টাইপ (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting leave type with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    leaveTypes: computed(() => leaveTypes.value),
    leaveType: computed(() => leaveType.value),
    leaveBalance: computed(() => leaveBalance.value), // Computed for leave balance
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchLeaveTypes,
    fetchLeaveType,
    
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
  };
});
