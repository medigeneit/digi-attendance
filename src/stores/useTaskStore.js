import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([]);
  const task_todo_dates = ref([]);
  const task_todos = ref([]);
  const task = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const currentPage = ref(1);
  const hasMoreTask = ref(true);



  const assignUsers = async (taskId, user_ids, {updateStoreData = true}) => {

    if( updateStoreData == true ) {
      loading.value = true;
      error.value = null;
    }

    try {
      await apiClient.post(`/tasks/${taskId}/assign-users`, { user_ids });
      await fetchTask(taskId); // refresh task details
    } catch (err) {
      if( updateStoreData == true ) {
        error.value = err.response?.data?.message || 'Assign users failed';
      }
      throw err;
    } finally {
      if( updateStoreData == true ) {
        loading.value = false;
      }
    }
  };

  function resetTaskList(){
    currentPage.value = 1
    tasks.value = []
  }

  async function fetchTasks(params, config = {}) {
    error.value = null;

    try {

      const queryParams = {
        ...params,
        per_page: 5000
      }

      loading.value = true

      const response = await apiClient.get( '/tasks', { params: queryParams, ...config } );

      tasks.value = response.data?.tasks || [];

      loading.value = false

      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'টাস্ক লোড করতে ব্যর্থ হয়েছে।';
      throw err
    }

  };

  const fetchMyTasks = async (params, config) => {

    error.value = null;
    try {
      const response = await apiClient.get('/my-tasks', {params,...config});
      tasks.value = response.data?.tasks || [];
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'টাস্ক লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching tasks:', err);
      throw err
    }
  };

  function buildTree(list, parentId = 0) {
    if( Array.isArray(list) === false || list.length === 0) {
      return []
    }

    return list
      .filter(item => item?.parent_id === parentId)
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
        task_todos.value = response.data?.todos || {};
        task_todo_dates.value = response.data?.todo_dates || {};
        tasks.value = response.data.sub_tasks || []
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
      throw err
    } finally {
      loading.value = false;
    }
  };


  const setTaskRequirement =  async (taskId, detailId) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.patch(`/tasks/${taskId}/update-requirement-detail/${detailId}`);
      tasks.value = tasks.value.filter((t) => t.id !== taskId);
    } catch (err) {
      error.value = err.response?.data?.message || `টাস্ক (ID: ${taskId}) রেকয়্যারমেন্ট সেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting task with id ${taskId}:`, err);
      throw err
    } finally {
      loading.value = false;
    }
  }


  return {
    tasks: computed(() => tasks.value),
    task_todos: computed(() => task_todos.value),
    task_todo_dates: computed(() => task_todo_dates.value),
    task: computed(() => task.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    taskListTree: computed(getTaskListTree),
    flattenedTasks: computed(getFlattenedTasks),
    fetchTasks,
    hasMoreTask,
    fetchMyTasks,
    resetTaskList,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    assignUsers,
    updateTaskPriorities,
    setTaskRequirement
  };
});
