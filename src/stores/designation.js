import { reactive, computed } from 'vue';
import apiClient from '../axios';

export function useDesignationStore() {
  const state = reactive({
    designations: [], // List of designations
    designation: null, // Single designation details
    loading: false, // Loading state
    error: null, // Error state
  });

  const designations = computed(() => state.designations);
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);

  const fetchDesignations = async () => {
    state.loading = true;
    try {
      const response = await apiClient.get('/designations');
      state.designations = response.data;
      return state.designations;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch designations';
      console.error('Error fetching designations:', error);
    } finally {
      state.loading = false;
    }
  };

  const fetchDesignation = async (id) => {
    state.loading = true;
    try {
      const response = await apiClient.get(`/designations/${id}`);
      state.designation = response.data;
      return state.designation;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch designation';
      console.error(`Error fetching designation with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  const createDesignation = async (data) => {
    state.loading = true;
    try {
      const response = await apiClient.post('/designations', data);
      state.designations.push(response.data); // Add new designation to list
      return response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to create designation';
      console.error('Error creating designation:', error);
    } finally {
      state.loading = false;
    }
  };

  const updateDesignation = async (id, data) => {
    state.loading = true;
    try {
      const response = await apiClient.put(`/designations/${id}`, data);
      const index = state.designations.findIndex((d) => d.id === id);
      if (index !== -1) {
        state.designations[index] = response.data; // Update the designation in the list
      }
      return response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to update designation';
      console.error(`Error updating designation with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  const deleteDesignation = async (id) => {
    state.loading = true;
    try {
      await apiClient.delete(`/designations/${id}`);
      state.designations = state.designations.filter((d) => d.id !== id); // Remove the designation
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to delete designation';
      console.error(`Error deleting designation with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  return {
    designations,
    loading,
    error,
    fetchDesignations,
    fetchDesignation,
    createDesignation,
    updateDesignation,
    deleteDesignation,
  };
}
