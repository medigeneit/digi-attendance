import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useUserPermissionStore = defineStore('permission', () => {
  const userPermissions = ref([]);
  const userPermission = ref(null);
  const featureCatalog = ref([]);
  const featureRoles = ref([]);
  const roleFeaturePermissions = ref({});
  const userFeaturePermissions = ref({});
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

  const fetchFeatureCatalog = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/feature-permissions/catalog');
      featureCatalog.value = response?.data?.data || [];
      featureRoles.value = response?.data?.roles || [];
      return featureCatalog.value;
    } catch (err) {
      error.value = err.response?.data?.message || 'Feature permission catalog load failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRoleFeaturePermissions = async (role) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/roles/${role}/feature-permissions`);
      roleFeaturePermissions.value[role] = response?.data?.data || {};
      return roleFeaturePermissions.value[role];
    } catch (err) {
      error.value = err.response?.data?.message || 'Role feature permissions load failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRoleFeaturePermissions = async (role, permissions) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/roles/${role}/feature-permissions`, { permissions });
      roleFeaturePermissions.value[role] = response?.data?.data || {};
      return roleFeaturePermissions.value[role];
    } catch (err) {
      error.value = err.response?.data?.message || 'Role feature permissions update failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchUserFeaturePermissions = async (userId) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/users/${userId}/feature-permissions`);
      userFeaturePermissions.value[userId] = response?.data?.data || {};
      return userFeaturePermissions.value[userId];
    } catch (err) {
      error.value = err.response?.data?.message || 'User feature permissions load failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateUserFeaturePermissions = async (userId, permissions) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/users/${userId}/feature-permissions`, { permissions });
      userFeaturePermissions.value[userId] = response?.data?.data || {};
      return userFeaturePermissions.value[userId];
    } catch (err) {
      error.value = err.response?.data?.message || 'User feature permissions update failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    userPermissions: computed(() => userPermissions.value),
    userPermission: computed(() => userPermission.value),
    featureCatalog: computed(() => featureCatalog.value),
    featureRoles: computed(() => featureRoles.value),
    roleFeaturePermissions: computed(() => roleFeaturePermissions.value),
    userFeaturePermissions: computed(() => userFeaturePermissions.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchUserPermissions,
    fetchPermission,
    createPermission,
    updatePermission,
    deletePermission,
    fetchFeatureCatalog,
    fetchRoleFeaturePermissions,
    updateRoleFeaturePermissions,
    fetchUserFeaturePermissions,
    updateUserFeaturePermissions,
  };
});
