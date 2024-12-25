import { reactive } from 'vue';
import axios from 'axios';

const state = reactive({
  shifts: [],
  loading: false,
  error: null,
});

const fetchShifts = async () => {
  state.loading = true;
  try {
    const response = await axios.get('/api/shifts');
    state.shifts = response.data;
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
    const response = await axios.get(`/api/shifts/${id}`);
    return response.data;
  } catch (error) {
    state.error = error.response?.data?.message || `Failed to fetch shift with id ${id}`;
    console.error(`Error fetching shift with id ${id}:`, error);
  } finally {
    state.loading = false;
  }
};

const createShift = async (shift) => {
  state.loading = true;
  try {
    const response = await axios.post('/api/shifts', shift);
    state.shifts.push(response.data);
  } catch (error) {
    state.error = error.response?.data?.message || 'Failed to create shift';
    console.error('Error creating shift:', error);
  } finally {
    state.loading = false;
  }
};

const updateShift = async (id, shift) => {
  state.loading = true;
  try {
    const response = await axios.put(`/api/shifts/${id}`, shift);
    const index = state.shifts.findIndex((s) => s.id === id);
    if (index !== -1) {
      state.shifts[index] = response.data;
    }
  } catch (error) {
    state.error = error.response?.data?.message || `Failed to update shift with id ${id}`;
    console.error(`Error updating shift with id ${id}:`, error);
  } finally {
    state.loading = false;
  }
};

const deleteShift = async (id) => {
  state.loading = true;
  try {
    await axios.delete(`/api/shifts/${id}`);
    state.shifts = state.shifts.filter((s) => s.id !== id);
  } catch (error) {
    state.error = error.response?.data?.message || `Failed to delete shift with id ${id}`;
    console.error(`Error deleting shift with id ${id}:`, error);
  } finally {
    state.loading = false;
  }
};

export default {
  state,
  fetchShifts,
  fetchShift,
  createShift,
  updateShift,
  deleteShift,
};
