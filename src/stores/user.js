import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref([]);
  const handoverUsers = ref([]);
  const user = ref({});
  const dashboardInfo = ref({});
  const error = ref(null);
  const isLoading = ref(false); // লোডিং স্টেট
  const selectedDate = ref(new Date().toISOString().substring(0, 10));

  // Getters
  const allUsers = computed(() => users.value);
  const singleUser = computed(() => user.value);
  const errorMessage = computed(() => error.value);

  // Actions
  const fetchUsers = async () => {
    try {
      isLoading.value = true; // লোডিং শুরু
      const response = await apiClient.get('/users');
      users.value = response.data;
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false; // লোডিং শেষ
    }
  };

  const fetchDepartmentWiseEmployees = async () => {
    try {
      isLoading.value = true; // লোডিং শুরু
      const response = await apiClient.get('/department-wise-employees');
      users.value = response.data;
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false; // লোডিং শেষ
    }
  };

  const fetchHandoverDepartmentWiseEmployees = async () => {
    try {
      isLoading.value = true; // লোডিং শুরু
      const response = await apiClient.get('/department-handover-wise-employees');
      handoverUsers.value = response.data;
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false; // লোডিং শেষ
    }
  };

  const fetchUser = async (id) => {
    try {
      isLoading.value = true;
      const response = await apiClient.get(`/users/${id}`);
      const data = response.data;
      if(data) {
        user.value = data;
      }
      error.value = null;
      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  const fetchUserDashboardData = async () => {
    try {
      isLoading.value = true;
      const response = await apiClient.get('/dashboard');
      const data = response.data;
      if(data) {
        dashboardInfo.value = data;
      }
      error.value = null;
      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  const createUser = async (payload) => {
    try {
      isLoading.value = true;
      const response = await apiClient.post('/users', payload);
      users.value.push(response.data.user);
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  const updateUser = async (id, payload) => {
    try {
      isLoading.value = true;
      const response = await apiClient.put(`/users/${id}`, payload);
      const index = users.value.findIndex((u) => u.id === id);
      if (index !== -1) {
        users.value[index] = response.data.user;
      }
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  const deleteUser = async (id) => {
    try {
      isLoading.value = true;
      await apiClient.delete(`/users/${id}`);
      users.value = users.value.filter((u) => u.id !== id);
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  // Return state, getters, and actions
  return {
    users,
    handoverUsers,
    user,
    error,
    isLoading, // লোডিং স্টেট রিটার্ন করা
    allUsers,
    singleUser,
    errorMessage,
    dashboardInfo,
    selectedDate,
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    deleteUser,
    fetchUserDashboardData,
    fetchDepartmentWiseEmployees,
    fetchHandoverDepartmentWiseEmployees,
  };
});
