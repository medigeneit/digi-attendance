import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';


export const useTodoStore = defineStore('todo', () => {
  // const todos = ref([]);
  const todo = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const todos = ref([])

  const fetchTodos = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/todos');
      todos.value = response.data?.todos || [];
    } catch (err) {
      error.value = err.response?.data?.message || 'Todos load failed';
      throw err
    } finally {
      loading.value = false;
    }
  }

  function sortTodoList(){
    todos.value = todos.value.sort((listA, listB) => {
      if( listA?.user?.id !== listB?.user?.id ) {
        return listA?.user?.id - listB?.user?.id
      }

      if( listA.priority !== listB.priority ) {
        return listA.priority - listB.priority
      }
      return listB.id - listA.id
    })
  }

  const fetchMyTodos = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/my-todos');
      todos.value = response.data?.todos || [];
    } catch (err) {
      error.value = err.response?.data?.message || 'Todos load failed';
      throw err
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

      todo.value = todos.value.find( td => td.id == id);
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo load failed';
      throw err
    } finally {
      loading.value = false;
    }
  };

  const createTodo = async (data, {returnWith} = {} ) => {
    loading.value = true;
    error.value = null;
    try {

      const response = await apiClient.post('/todos', data,         {
          params: {return_with: returnWith}
        });
      todos.value = [...todos.value, response.data?.todo];

      sortTodoList()

      return response.data;

    } catch (err) {
      error.value = err.response?.data?.message || 'Todo create failed';
      throw err
    } finally {
      loading.value = false;
    }
  };

  const updateTodo = async (id, data ) => {
    loading.value = true;
    error.value = null;


    try {
      const response = await apiClient.put(`/todos/${id}`, data);

      todos.value = todos.value.map( todo => {

        if( todo.id == response.data?.todo?.id ) {

          if( todo.user ) {
            return {
              ...response.data?.todo,
              user: {...todo.user}
            }
          }
          return {...response.data?.todo};
        }

        return {...todo}
      })

      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo update failed';
      throw err
    } finally {
      loading.value = false;
    }
  };

  // Update todo status
  const updateTodoStatus = async (id, status ) => {

    loading.value = true;
    error.value = null;
    try {
      await apiClient.put( `/todos/status/${id}`, { status });

      todos.value = todos.value.map( todo => {
        if( todo.id === id ) {
          return {...todo, status}
        }

        return {...todo}
      })

    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update todo status';
      throw err
    } finally {
      loading.value = false;
    }

  };


  const deleteTodo = async (id) => {
    loading.value = true;
    error.value = null;

    // todos.value = todos.value.filter((todo) => todo.id !== id);

    try {
      await apiClient.delete(`/todos/${id}`);
      todos.value = todos.value.filter((todo) => todo.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo delete failed';
      throw err
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
