import { reactive, computed } from 'vue';
import apiClient from '../axios';

export function useDeviceStore() {
  const state = reactive({
    devices: [],
    device: null,
    loading: false,
    error: null,
  });

  const devices = computed(() => state.devices);
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);

  const fetchDevices = async () => {
    state.loading = true;
    try {
      const response = await apiClient.get('/devices');
      state.devices = response.data;
      return state.devices;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch devices';
    } finally {
      state.loading = false;
    }
  };

  const fetchDevice = async (id) => {
    state.loading = true;
    try {
      const response = await apiClient.get(`/devices/${id}`);
      state.device = response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch device';
    } finally {
      state.loading = false;
    }
  };

  const createDevice = async (data) => {
    state.loading = true;
    try {
      const response = await apiClient.post('/devices', data);
      state.devices.push(response.data);
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to create device';
    } finally {
      state.loading = false;
    }
  };

  const updateDevice = async (id, data) => {
    state.loading = true;
    try {
      const response = await apiClient.put(`/devices/${id}`, data);
      const index = state.devices.findIndex((device) => device.id === id);
      if (index !== -1) {
        state.devices[index] = response.data;
      }
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to update device';
    } finally {
      state.loading = false;
    }
  };

  const deleteDevice = async (id) => {
    state.loading = true;
    try {
      await apiClient.delete(`/devices/${id}`);
      state.devices = state.devices.filter((device) => device.id !== id);
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to delete device';
    } finally {
      state.loading = false;
    }
  };

  return {
    devices,
    loading,
    error,
    fetchDevices,
    fetchDevice,
    createDevice,
    updateDevice,
    deleteDevice,
  };
}
