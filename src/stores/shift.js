import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '../axios';

export const useShiftStore = defineStore('shift', () => {
  const shifts = ref([]); // শিফট লিস্ট
  const shift = ref(null); // একক শিফট ডিটেইল
  const loading = ref(false); // লোডিং স্টেট
  const error = ref(null); // এরর স্টেট

  const fetchShifts = async (companyId = null) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/shifts', {
        params: { company_id: companyId },
      });
      shifts.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'শিফট লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching shifts:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchShift = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/shifts/${id}`);
      shift.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `শিফট (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching shift with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const createShift = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/shifts', data);
      shifts.value.push(response.data); // নতুন শিফট লিস্টে যোগ করুন
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'শিফট তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating shift:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateShift = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/shifts/${id}`, data);
      const index = shifts.value.findIndex((shift) => shift.id === id);
      if (index !== -1) {
        shifts.value[index] = response.data; // আপডেট করা শিফট
      }
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `শিফট (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating shift with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteShift = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/shifts/${id}`);
      shifts.value = shifts.value.filter((shift) => shift.id !== id); // শিফট রিমুভ
    } catch (err) {
      error.value = err.response?.data?.message || `শিফট (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting shift with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    shifts: computed(() => shifts.value),
    shift: computed(() => shift.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchShifts,
    fetchShift,
    createShift,
    updateShift,
    deleteShift,
  };
});
