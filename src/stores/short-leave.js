import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '@/axios'; // Assuming axios is configured in '@/axios'

export const useShortLeaveStore = defineStore('shortLeave', () => {
  // State
  const shortLeaves = ref([]);
  const shortLeave = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Fetch all short leaves
  const fetchShortLeaves = async (filters = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/short-leaves', { params: filters });
      shortLeaves.value = response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch short leaves';
      console.error('Error fetching short leaves:', err);
    } finally {
      loading.value = false;
    }
  };

  // Fetch a single short leave by ID
  const fetchShortLeaveById = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/short-leaves/${id}`);
      shortLeave.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to fetch short leave (ID: ${id})`;
      console.error(`Error fetching short leave with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  // Create a new short leave
  const createShortLeave = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/short-leaves/store', data);
      shortLeaves.value.push(response.data.data);
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create short leave';
      console.error('Error creating short leave:', err);
      throw new Error(error.value);
    } finally {
      loading.value = false;
    }
  };

  // Update a short leave
  const updateShortLeave = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/short-leaves/${id}`, data);
      const index = shortLeaves.value.findIndex((leave) => leave.id === id);
      if (index !== -1) {
        shortLeaves.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update short leave (ID: ${id})`;
      console.error(`Error updating short leave with id ${id}:`, err);
      throw new Error(error.value);
    } finally {
      loading.value = false;
    }
  };

  // Delete a short leave
  const deleteShortLeave = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/short-leaves/${id}`);
      shortLeaves.value = shortLeaves.value.filter((leave) => leave.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to delete short leave (ID: ${id})`;
      console.error(`Error deleting short leave with id ${id}:`, err);
      throw new Error(error.value);
    } finally {
      loading.value = false;
    }
  };

  // Computed properties
  return {
    shortLeaves: computed(() => shortLeaves.value),
    shortLeave: computed(() => shortLeave.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchShortLeaves,
    fetchShortLeaveById,
    createShortLeave,
    updateShortLeave,
    deleteShortLeave,
  };
});
