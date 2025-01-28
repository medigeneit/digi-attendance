import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useDesignationStore = defineStore('designation', () => {
  const designations = ref([]); // Designation লিস্ট
  const designation = ref(null); // একক Designation ডিটেইল
  const loading = ref(false); // লোডিং স্টেট
  const error = ref(null); // এরর স্টেট

  const fetchDesignations = async (companyId = null) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/designations', {
        params: { company_id: companyId },
      });
      const data = response.data.map(designation => ({
        ...designation,
        companyName: designation?.company?.name || 'Unknown Company'
      }))
      .reduce((acc, designation) => {
        const { companyName } = designation;
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(designation);
        return acc;
      }, {});

      designations.value = data;
      // designations.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'ডিজাইনেশন লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching designations:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchDesignation = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/designations/${id}`);
      designation.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `ডিজাইনেশন (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching designation with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const createDesignation = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/designations', data);
      designations.value.push(response.data); // নতুন ডিজাইনেশন লিস্টে যোগ করুন
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'ডিজাইনেশন তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating designation:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateDesignation = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/designations/${id}`, data);
      const index = designations.value.findIndex((d) => d.id === id);
      if (index !== -1) {
        designations.value[index] = response.data; // আপডেট করা ডিজাইনেশন
      }
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `ডিজাইনেশন (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating designation with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteDesignation = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/designations/${id}`);
      designations.value = designations.value.filter((d) => d.id !== id); // ডিজাইনেশন রিমুভ করুন
    } catch (err) {
      error.value = err.response?.data?.message || `ডিজাইনেশন (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting designation with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    designations: computed(() => designations.value),
    designation: computed(() => designation.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchDesignations,
    fetchDesignation,
    createDesignation,
    updateDesignation,
    deleteDesignation,
  };
});
