import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useBugStore = defineStore('bug', () => {
  const bugs = ref([]);
  const bug = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const assignUsers = async (bugId, user_ids) => {
    loading.value = true;
    error.value = null;

    console.log('ss', bugId, user_ids);
    try {
      
      await apiClient.post(`/bugs/${bugId}/assign-users`, { user_ids });
      await fetchBug(bugId); // refresh bug details
    } catch (err) {
      error.value = err.response?.data?.message || 'Assign users failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };


  const fetchBugs = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/bugs');
      bugs.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'বাগ লোড করতে ব্যর্থ হয়েছে।';
    } finally {
      loading.value = false;
    }
  };

  // ✅ Fetch single bug by ID (for editing)
  const fetchBug = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/bugs/${id}`);
      bug.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `বাগ (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
    } finally {
      loading.value = false;
    }
  };

  // ✅ Update bug
  const updateBug = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/bugs/${id}`, data);
      const index = bugs.value.findIndex((b) => b.id === id);
      if (index !== -1) {
        bugs.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || `বাগ (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createBug = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/bugs', data);
      bugs.value.push(response.data.data);
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'বাগ তৈরি করতে ব্যর্থ হয়েছে।';
    } finally {
      loading.value = false;
    }
  };

  const deleteBug = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/bugs/${id}`);
      bugs.value = bugs.value.filter((b) => b.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `বাগ (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
    } finally {
      loading.value = false;
    }
  };

  return {
    bugs: computed(() => bugs.value),
    bug: computed(() => bug.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchBugs,
    fetchBug,      // ✅ added
    createBug,
    updateBug,     // ✅ added
    deleteBug,
    assignUsers
  };
});
