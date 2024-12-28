import { reactive, computed } from 'vue';
import apiClient from '../axios';

export function useUserStore() {
  const state = reactive({
    users: [], // List of users
    user: null, // Single user details
    error: null, // Error state
  });

  const users = computed(() => state.users);
  const user = computed(() => state.user);
  const error = computed(() => state.error);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      state.users = response.data;
      state.error = null;
    } catch (err) {
      state.error = err.response?.data?.message || 'Something went wrong';
    }
  };

  const fetchUser = async (id) => {
    try {
      const response = await apiClient.get(`/users/${id}`);
      state.user = response.data;
      state.error = null;
      return response.data;
    } catch (err) {
      state.error = err.response?.data?.message || 'Something went wrong';
    }
  };

  const createUser = async (payload) => {
    try {
      const response = await apiClient.post('/users', payload);
      state.users.push(response.data.user);
      state.error = null;
    } catch (err) {
      state.error = err.response?.data?.message || 'Something went wrong';
    }
  };

  const updateUser = async (id, payload) => {
    try {
      const response = await apiClient.put(`/users/${id}`, payload);
      const index = state.users.findIndex((u) => u.id === id);
      if (index !== -1) {
        state.users[index] = response.data.user;
      }
      state.error = null;
    } catch (err) {
      state.error = err.response?.data?.message || 'Something went wrong';
    }
  };

  const deleteUser = async (id) => {
    try {
      await apiClient.delete(`/users/${id}`);
      state.users = state.users.filter((u) => u.id !== id);
      state.error = null;
    } catch (err) {
      state.error = err.response?.data?.message || 'Something went wrong';
    }
  };

  return {
    users,
    user,
    error,
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    deleteUser,
  };
}
