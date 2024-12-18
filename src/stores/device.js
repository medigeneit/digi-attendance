import { defineStore } from 'pinia'
import apiClient from '../axios'

export const useDeviceStore = defineStore('device', {
  state: () => ({
    devices: [],
    device: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchDevices() {
      this.loading = true;
      try {
        const response = await apiClient.get('/devices');
        this.devices = response.data;
        return this.devices;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch devices';
      } finally {
        this.loading = false;
      }
    },

    async fetchDevice(id) {
      this.loading = true;
      try {
        const response = await apiClient.get(`/devices/${id}`);
        this.device = response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch device';
      } finally {
        this.loading = false;
      }
    },

    async createDevice(data) {
      this.loading = true;
      try {
        const response = await apiClient.post('/devices', data);
        this.devices.push(response.data);
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create device';
      } finally {
        this.loading = false;
      }
    },

    async updateDevice(id, data) {
      this.loading = true;
      try {
        const response = await apiClient.put(`/devices/${id}`, data);
        const index = this.devices.findIndex(device => device.id === id);
        if (index !== -1) {
          this.devices[index] = response.data;
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to update device';
      } finally {
        this.loading = false;
      }
    },

    async deleteDevice(id) {
      this.loading = true;
      try {
        await apiClient.delete(`/devices/${id}`);
        this.devices = this.devices.filter(device => device.id !== id);
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to delete device';
      } finally {
        this.loading = false;
      }
    },
  },
});
