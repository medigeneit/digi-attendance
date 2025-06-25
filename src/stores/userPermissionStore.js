import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useUserPermissionStore = defineStore('permission', () => {
  const userPermissions = ref([]);
  const userPermission = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchUserPermissions = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/permissions');
      userPermissions.value = response?.data?.data || [];
    } catch (err) {
      error.value = err.response?.data?.message || 'Permission load failed';
    } finally {
      loading.value = false;
    }
  }


  const fetchPermission = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/permissions/${id}`);
      userPermission.value = response?.data?.data ||[];
      return response?.data?.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Permission load failed';
    } finally {
      loading.value = false;
    }
  };

  const createPermission = async (payload) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post('/permissions', payload);
            await fetchUserPermissions(); // Assuming you have this to refresh list
            return response?.data?.data;
        } catch (err) {
            console.error(err);
            error.value = err.response?.data?.message || 'Permission creation failed';
            throw err; // Important: Re-throw so component can handle
        } finally {
            loading.value = false;
        }
    };


  const updatePermission = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/permissions/${id}`, data);
      const index = userPermissions.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        userPermissions.value[index] = response.data;
      }
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Permission update failed';
    } finally {
      loading.value = false;
    }
  };
 

  const deletePermission = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/permissions/${id}`);
      userPermissions.value = userPermissions.value.filter((permission) => permission.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || 'permission delete failed';
    } finally {
      loading.value = false;
    }
  };

  return {
    userPermissions: computed(() => userPermissions.value),
    userPermission: computed(() => userPermission.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchUserPermissions,
    fetchPermission,
    createPermission,
    updatePermission,
    deletePermission,
  };
});
