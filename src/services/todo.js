
import { objectToQuery } from '@/libs/url';
import apiClient from '../axios';

export async function getTodos({params = {}} = {}){
  return apiClient.get('/todos', {params});
}

export async function createTodo(data){
  return apiClient.post(`/todos`, data);
}

export async function findTodo(todoId, data){
  return apiClient.get(`/todos/${todoId}`, data);
}

export async function updateTodo(todoId, data){
  return apiClient.put(`/todos/${todoId}`, data);
}

export async function updateTodoStatus(todoId, data){
  return apiClient.patch(`/todos/${todoId}/status`, data);
}

export async function deleteTodo(todoId, {params = {}} = {}){
  const query = objectToQuery(params)
  return apiClient.delete(`/todos/${todoId}${query ? '?' + query :''}`);
}


//ToDo Settings
export async function findTodoSetting(todoId, { params = {} } = {}) {
  return apiClient.get(`/todos/${todoId}/settings`, { params })
}

export async function upsertTodoSetting(todoId, data) {
  return apiClient.post(`/todos/${todoId}/settings`, data)
}

export async function deleteTodoSetting(todoId,settingId, { params = {} } = {}) {
  const query = objectToQuery(params)
  return apiClient.delete(`/todos/${todoId}/settings/${settingId}${query ? `?${query}` : ''}`)
}



//ToDo Dates
export async function getTodoDates({params = {}} = {}){
  return apiClient.get('/todo-dates', {params});
}

export async function getMyTodoDates({params = {}} = {}){
  return apiClient.get('/my-todo-dates', {params});
}

export async function createTodoDate(data){
  return apiClient.post(`/todo-dates`, data);
}

export async function findTodoDate(todoDateId, data){
  return apiClient.get(`/todo-dates/${todoDateId}`, data);
}

export async function getTodoHistories(todoId, { params = {} } = {}){
  return apiClient.get(`/todos/${todoId}/histories`, { params });
}

export async function updateTodoDate(todoDateId, data){
  return apiClient.put(`/todo-dates/${todoDateId}`, data);
}

export async function updateTodoDateStatus(todoDateId, data){
  return apiClient.patch(`/my-todo-dates/${todoDateId}/status`, data);
}

export async function deleteTodoDate(todoDateId, {params = {}} = {}){
  const query = objectToQuery(params)
  return apiClient.delete(`/todo-dates/${todoDateId}${query ? '?' + query :''}`);
}


