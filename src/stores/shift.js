import { reactive, computed } from 'vue';
import apiClient from '../axios';

export function useShiftStore() {
  const state = reactive({
    shifts: [], // List of shifts
    shift: null, // Single shift details
    loading: false, // Loading state
    error: null, // Error state
  });

  const shifts = computed(() => state.shifts);
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);

  const fetchShifts = async () => {
    state.loading = true;
    try {
      const response = await apiClient.get('/shifts');
      state.shifts = response.data;
      return state.shifts;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch shifts';
      console.error('Error fetching shifts:', error);
    } finally {
      state.loading = false;
    }
  };

  const fetchShift = async (id) => {
    state.loading = true;
    try {
      const response = await apiClient.get(`/shifts/${id}`);
      state.shift = response.data;
      return state.shift;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch shift';
      console.error(`Error fetching shift with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  const createShift = async (data) => {
    state.loading = true;
    try {
      const response = await apiClient.post('/shifts', data);
      state.shifts.push(response.data); // Add new shift to list
      return response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to create shift';
      console.error('Error creating shift:', error);
    } finally {
      state.loading = false;
    }
  };

  const updateShift = async (id, data) => {
    state.loading = true;
    try {
      const response = await apiClient.put(`/shifts/${id}`, data);
      const index = state.shifts.findIndex((shift) => shift.id === id);
      if (index !== -1) {
        state.shifts[index] = response.data; // Update the shift in the list
      }
      return response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to update shift';
      console.error(`Error updating shift with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  const deleteShift = async (id) => {
    state.loading = true;
    try {
      await apiClient.delete(`/shifts/${id}`);
      state.shifts = state.shifts.filter((shift) => shift.id !== id); // Remove the shift from the list
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to delete shift';
      console.error(`Error deleting shift with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  return {
    shifts,
    loading,
    error,
    fetchShifts,
    fetchShift,
    createShift,
    updateShift,
    deleteShift,
  };
}
