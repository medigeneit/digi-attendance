import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '../axios';

export const useLeaveTypeStore = defineStore('leaveType', () => {
  const leaveTypes = ref([]); // লিভ টাইপ লিস্ট
  const leaveType = ref(null); // একক লিভ টাইপ ডিটেইল
  const loading = ref(false); // লোডিং স্টেট
  const error = ref(null); // এরর স্টেট

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
      leaveTypes.value.push(response.data); // নতুন লিভ টাইপ লিস্টে যোগ করুন
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
      const index = leaveTypes.value.findIndex((type) => type.id === id);
      if (index !== -1) {
        leaveTypes.value[index] = response.data; // আপডেট করা লিভ টাইপ
      }
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
      leaveTypes.value = leaveTypes.value.filter((type) => type.id !== id); // লিভ টাইপ রিমুভ
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
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchLeaveTypes,
    fetchLeaveType,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
  };
});
