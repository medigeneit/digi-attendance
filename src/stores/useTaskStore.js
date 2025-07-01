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

  const fetchTasks = async (params,{loadingBeforeFetch = true, newList=false} = {}) => {
    if(loadingBeforeFetch ) {
      loading.value = true;
    }

    error.value = null;
    try {
      let response;
      if( newList ) {
        response = await apiClient.get('/tasks2', {params});
      } else {
        response = await apiClient.get('/tasks', {params});
      }

      tasks.value = response.data?.tasks || [];
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'টাস্ক লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching tasks:', err);
    } finally {
      loading.value = false;
    }
  };

  function buildTree(list, parentId = 0) {
    if( Array.isArray(list) === false || list.length === 0) {
      return []
    }

    return list
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children_tasks: buildTree(list, item.id)
      }));
  }

  function getTaskListTree(){
    return buildTree(tasks.value, 0);
  }

  function getFlattenedTasks() {
    const result = [];

    const traverse = (nodes, depth = 0, path = '') => {
      nodes.forEach(node => {
        
        result.push({
          ...node,
          depth,
          idPath: path + node.id
        });

        if (node.children_tasks && node.children_tasks.length) {
          traverse(node.children_tasks, depth + 1, path + node.id + '-');
        }

      });
    };

    traverse(getTaskListTree());
    return result;
  }


  const fetchTask = async (id, params = {}, options = {loadingBeforeFetch: true, fetchOnly: false}) => {

    if( !options.fetchOnly ) {
      loading.value = true;
    }

    error.value = null;
    
    try {
      const response = await apiClient.get(`/tasks/${id}`, {params});
      if( !options.fetchOnly ) {
        task.value = response.data?.task || {};
      }
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || `টাস্ক (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      if( !options.fetchOnly ) {
        error.value = msg;
      }
      return msg
    } finally {
      if( !options.fetchOnly ) {
        loading.value = false;
      }
    }
  };

  const createTask = async (data, options = {loadingBeforeCreate: false}) => {
    if( options.loadingBeforeCreate ) {
      loading.value = true;
    }
    error.value = null;
    try {
      const response = await apiClient.post('/tasks', data);
      if( response.data?.data ) {
        tasks.value.push(response.data?.data);
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'টাস্ক তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating task:', err);
      throw err
    } finally {
      if( options.loadingBeforeCreate ) {
        loading.value = false;
      }
    }
  };

  const updateTask = async (id, data, {loadingBeforeFetch =true}) => {
    if( loadingBeforeFetch ) {
      loading.value = true;
    }
    error.value = null;
    try {
      const response = await apiClient.put(`/tasks/${id}`, data);
      const index = tasks.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        tasks.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      //error.value = err.response?.data?.message || `টাস্ক (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating task with id ${id}:`, err);
      throw err
    } finally {
      if( loadingBeforeFetch ) {
        loading.value = false;
      }
    }
  };

  const updateTaskPriorities = async (parentId, changedIds) => {
   
    const response = await apiClient.put(
      `/tasks/${parentId}/update-priorities`, {
      task_ids: changedIds
    });

    return response.data;
     
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
    taskListTree: computed(getTaskListTree),
    flattenedTasks: computed(getFlattenedTasks),
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    assignUsers,
    updateTaskPriorities
  };
});
