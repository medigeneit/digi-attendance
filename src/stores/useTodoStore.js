import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

import { todos } from '@/libs/dummy-todos.js';

export const useTodoStore = defineStore('todo', () => {
  // const todos = ref([]);
  const todo = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchTodos = async () => {
    loading.value = true;
    error.value = null;
    try {
      // const response = await apiClient.get('/todos');
      todos.value = todos;
    } catch (err) {
      error.value = err.response?.data?.message || 'Todos load failed';
    } finally {
      loading.value = false;
    }
  }
  const fetchMyTodos = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/my-todos');
      todos.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Todos load failed';
    } finally {
      loading.value = false;
    }
  };

  const getTodosByDate = (date) =>{
    return todos.value?.filter( todo => todo.date == date)
  }

  const fetchTodo = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/todos/${id}`);
      todo.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo load failed';
    } finally {
      loading.value = false;
    }
  };

  const createTodo = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/todos', data);
      todos.value.push(response.data);
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo create failed';
    } finally {
      loading.value = false;
    }
  };

  const updateTodo = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/todos/${id}`, data);
      const index = todos.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        todos.value[index] = response.data;
      }
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo update failed';
    } finally {
      loading.value = false;
    }
  };
  // Update todo status
  const updateTodoStatus = async (id, status) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.put(`/todos/status/${id}`, { status });
      fetchMyTodos()
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update todo status';
    } finally {
      loading.value = false;
    }
  };


  const deleteTodo = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/todos/${id}`);
      todos.value = todos.value.filter((todo) => todo.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo delete failed';
    } finally {
      loading.value = false;
    }
  };

  return {
    todos: computed(() => todos.value),
    todo: computed(() => todo.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchTodos,
    fetchTodo,
    createTodo,
    updateTodo,
    deleteTodo,
    fetchMyTodos,
    updateTodoStatus,
    getTodosByDate
  };
});
