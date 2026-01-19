import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useTodoProjectStore = defineStore('todoProject', () => {

  const projects = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchProjects = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/todo-projects');
      projects.value = response.data?.todo_projects || [];
    } catch (err) {
      error.value = err.response?.data?.message || 'Projects load failed';
      throw err
    } finally {
      loading.value = false;
    }
  }

  const createProject = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/todo-projects', data);
      projects.value = [...projects.value, response.data];
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Project create failed';
      throw err
    } finally {
      loading.value = false;
    }
  };

  const updateProject = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/todo-projects/${id}`, data);
      projects.value = projects.value.map(p => p.id === id ? response.data : p);
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Project update failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteProject = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/todo-projects/${id}`);
      projects.value = projects.value.filter(p => p.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || 'Project delete failed';
      throw err;
    } finally {
        loading.value = false;
    }
  };

  return {
    projects: computed(() => projects.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchProjects,
    createProject,
    updateProject,
    deleteProject
  };
});
