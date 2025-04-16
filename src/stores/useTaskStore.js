import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([]);
  const task = ref(null);
  const loading = ref(false);
  const error = ref(null);


  const assignUsers = async (taskId, user_ids) => {
    loading.value = true;
    error.value = null;

    try {
      await apiClient.post(`/tasks/${taskId}/assign-users`, { user_ids });
      await fetchTask(taskId); // refresh task details
    } catch (err) {
      error.value = err.response?.data?.message || 'Assign users failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchTasks = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/tasks');
      tasks.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'টাস্ক লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching tasks:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchTask = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/tasks/${id}`);
      task.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `টাস্ক (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching task with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const createTask = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/tasks', data);
      tasks.value.push(response.data.data);
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'টাস্ক তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating task:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateTask = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/tasks/${id}`, data);
      const index = tasks.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        tasks.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || `টাস্ক (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating task with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteTask = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/tasks/${id}`);
      tasks.value = tasks.value.filter((t) => t.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `টাস্ক (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting task with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    tasks: computed(() => tasks.value),
    task: computed(() => task.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    assignUsers
  };
});
