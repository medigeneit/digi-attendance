import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useProjectStore = defineStore('project', () => {
  const projects = ref([]);         // সকল প্রজেক্ট
  const project = ref(null);        // একক প্রজেক্ট
  const loading = ref(false);       // লোডিং স্টেট
  const error = ref(null);          // এরর স্টেট

  const fetchTaskManagementSummary = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/task-management-summaries');
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || '';
      console.error('Error fetching:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchProjects = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/projects');
      projects.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'প্রজেক্ট লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching projects:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchProject = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/projects/${id}`);
      project.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `প্রজেক্ট (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching project with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const createProject = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/projects', data);
      projects.value.push(response.data.data); // নতুন প্রজেক্ট যোগ
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'প্রজেক্ট তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating project:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateProject = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/projects/${id}`, data);
      const index = projects.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        projects.value[index] = response.data.data; // প্রজেক্ট আপডেট
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || `প্রজেক্ট (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating project with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteProject = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/projects/${id}`);
      projects.value = projects.value.filter((p) => p.id !== id); // প্রজেক্ট ডিলিট
    } catch (err) {
      error.value = err.response?.data?.message || `প্রজেক্ট (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting project with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    projects: computed(() => projects.value),
    project: computed(() => project.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    fetchTaskManagementSummary
  };
});
