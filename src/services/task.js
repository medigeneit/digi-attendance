
import { objectToQuery } from '@/libs/url';
import apiClient from '../axios';

export async function getTaskEmployees({params = {}} = {}){
  return apiClient.get('/tasks/employees', {params});
}

export async function updateTaskStatus(taskId, data){
  return apiClient.put(`/my-tasks/${taskId}/update-status`, data);
}

export async function deleteTask(taskId, {params = {}} = {}){
  const query = objectToQuery(params)
  return apiClient.delete(`/tasks/${taskId}${query ? '?' + query :''}`);
}

export async function restoreTask(taskId){
  return apiClient.post(`/tasks/${taskId}/restore`);
}

