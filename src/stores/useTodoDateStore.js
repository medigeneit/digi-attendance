import { createTodoDate as createDate, deleteTodoDate as deleteDate, findTodoDate, getTodoDates, updateTodoDateStatus } from '@/services/todo';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';


export const useTodoDateStore = defineStore('todo-date', () => {
  // const todos = ref([]);
  const todo_date = ref(null);
  const loading = ref(false);
  const updatingPriority = ref(false)
  const error = ref(null);
  const todo_dates = ref([])


  const emptyTodoDates = () => todo_date.value = []

  const fetchTodoDates = async (params) => {

    loading.value = true;
    error.value = null;
    try {
      const response = await getTodoDates({params});

      todo_dates.value = response.data?.todo_dates || [];
      sortTodoDateList()
    } catch (err) {
      error.value = err.response?.data?.message || 'TodoDates load failed';
      throw err
    } finally {
      loading.value = false;
    }
  }

  function sortTodoDateList(){
    todo_dates.value = [
      ...todo_dates.value.sort((listA, listB) => {

        if( listA?.user_id !== listB?.user_id ) {
          return  listA?.user_id - listB?.user_id
        }

        if( listA.priority !== listB.priority ) {
          return listA.priority - listB.priority
        }

        return listB.id - listA.id
      })
    ]
  }

  const fetchMyTodoDates = async (params) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/my-todo-dates', {params});
      todo_dates.value = response.data?.todo_dates || [];
      sortTodoDateList()
    } catch (err) {
      error.value = err.response?.data?.message || 'TodoDates load failed';
      throw err
    } finally {
      loading.value = false;
    }
  };

  const getTodoDatesByDate = (date) =>{
    return todo_dates.value?.filter( todo_date => todo_date.date == date)
  }

  const fetchTodoDate = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      // todo_date.value = response.data;
      // const response = await fetchTodoDate( id )

      const response = await findTodoDate( id )
      todo_date.value = response.data.todo_date;
      // todo_date.value = todo_dates.value.find( td => td.id == id);

    } catch (err) {
      error.value = err.response?.data?.message || 'Todo load failed';
      throw err
    } finally {
      loading.value = false;
    }
  };

  const createTodoDate = async (data  ) => {
    loading.value = true;
    error.value = null;
    try {

      const response = await createDate( data );

      todo_dates.value = [...todo_dates.value, response.data?.todo_date];

      sortTodoDateList()

      return response.data;

    } catch (err) {
      error.value = err.response?.data?.message || 'Todo create failed';
      throw err
    } finally {
      loading.value = false;
    }
  };

  const setNewTodoDate = (todoDate) => {
    todo_dates.value = [...todo_dates.value, todoDate];
    sortTodoDateList()
  }


  const updateTodoDate = async (id, data ) => {
    loading.value = true;
    error.value = null;


    try {
      const response = await updateTodoDate(id, data);

      todo_dates.value = todo_dates.value.map( todo => {

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
  const updateStatus = async (id, status ) => {

    loading.value = true;
    error.value = null;
    try {
      await updateTodoDateStatus(id, {status});

      todo_dates.value = todo_dates.value.map( todo => {
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


  const rearrangeMyTodoDates = async (ids, {date} = {}) => {
    loading.value = true;
    updatingPriority.value = true
    error.value = null;

    // todo_dates.value = todo_dates.value.filter((todo) => todo.id !== id);

    try {
      const response = await apiClient.put(`/my-todo-dates/rearrange`, {ids, date});
      //todo_dates.value = todo_dates.value.filter((todo) => todo.id !== id);

      todo_dates.value = todo_dates.value.map( todo => {
        const changes = (response.data?.changes || []);
        const changed = changes.find(t => t.id == todo.id)
        if( changed ) {

          return {
            ...todo,
            priority: changed.priority
          }
        }

        return todo
      })


      sortTodoDateList()
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo rearranging failed';
      throw err
    } finally {
      updatingPriority.value = true
      loading.value = false;
    }
  };

  async function deleteTodoDate(id){

    loading.value = true;
    error.value = null;

    try {
      await deleteDate(id)
      todo_dates.value = todo_dates.value.filter((todo) => todo.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || 'Todo delete failed';
      throw err
    } finally {
      loading.value = false;
    }

  }


  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    todo_dates: computed(() => todo_dates.value),
    todo_date: computed(() => todo_date.value),
    fetchTodoDates,
    fetchTodoDate,
    createTodoDate,
    updateTodoDate,
    rearrangeMyTodoDates,
    deleteTodoDate,
    fetchMyTodoDates,
    updateStatus,
    getTodoDatesByDate,
    setNewTodoDate,
    emptyTodoDates
  };
});
