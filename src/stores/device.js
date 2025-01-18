import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

export const useDeviceStore = defineStore('device', () => {
  const devices = ref([]) // ডিভাইস লিস্ট
  const device = ref(null) // একক ডিভাইস ডিটেইল
  const loading = ref(false) // লোডিং স্টেট
  const error = ref(null) // এরর স্টেট

  const fetchDevices = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/devices')
      devices.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'ডিভাইস লোড করতে ব্যর্থ হয়েছে।'
      console.error('Error fetching devices:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchDevice = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/devices/${id}`)
      device.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || `ডিভাইস (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`
      console.error(`Error fetching device with id ${id}:`, err)
    } finally {
      loading.value = false
    }
  }

  const createDevice = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/devices', data)
      devices.value.push(response.data) // নতুন ডিভাইস লিস্টে যোগ করুন
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'ডিভাইস তৈরি করতে ব্যর্থ হয়েছে।'
      console.error('Error creating device:', err)
    } finally {
      loading.value = false
    }
  }

  const updateDevice = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/devices/${id}`, data)
      const index = devices.value.findIndex((device) => device.id === id)
      if (index !== -1) {
        devices.value[index] = response.data // আপডেট করা ডিভাইস
      }
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || `ডিভাইস (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`
      console.error(`Error updating device with id ${id}:`, err)
    } finally {
      loading.value = false
    }
  }

  const deleteDevice = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/devices/${id}`)
      devices.value = devices.value.filter((device) => device.id !== id) // ডিভাইস রিমুভ
    } catch (err) {
      error.value = err.response?.data?.message || `ডিভাইস (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`
      console.error(`Error deleting device with id ${id}:`, err)
    } finally {
      loading.value = false
    }
  }

  const checkDeviceConnection = async (id) => {
    try {
      await apiClient.get(`/check-device-connection/${id}`)
      return true;
    } catch (error) {
      console.error(error)
      return false;
    }
  }

  return {
    devices: computed(() => devices.value),
    device: computed(() => device.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchDevices,
    fetchDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    checkDeviceConnection,
  }
})
