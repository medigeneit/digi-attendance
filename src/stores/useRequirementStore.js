import { getRequirements, getRequirementsWithTasks } from '@/services/requirement';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useRequirementStore = defineStore('requirement', () => {
  const requirements = ref([]);
  const requirementDetails = ref([]);
  const requirement = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchRequirements = async ( params = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await getRequirements({params});
      requirements.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'রিকোয়ারমেন্ট লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching requirements:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchRequirementsWithTasks = async ( params = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await getRequirementsWithTasks({params});
      requirementDetails.value = response.data?.requirement_details || [];
      console.log({response})
    } catch (err) {
      error.value = err.response?.data?.message || 'রিকোয়ারমেন্ট লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching requirements:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRequirement = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/requirements/${id}`);
      requirement.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `রিকোয়ারমেন্ট (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching requirement with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const createRequirement = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/requirements', data);
      requirements.value.push(response.data.data);
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'রিকোয়ারমেন্ট তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating requirement:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateRequirement = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/requirements/${id}`, data);
      const index = requirements.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        requirements.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || `রিকোয়ারমেন্ট (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating requirement with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteRequirement = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/requirements/${id}`);
      requirements.value = requirements.value.filter((r) => r.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `রিকোয়ারমেন্ট (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting requirement with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    requirements: computed(() => requirements.value),
    requirementDetails: computed(() => requirementDetails.value),
    requirement: computed(() => requirement.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchRequirementsWithTasks,
    fetchRequirements,
    fetchRequirement,
    createRequirement,
    updateRequirement,
    deleteRequirement,
  };
});
