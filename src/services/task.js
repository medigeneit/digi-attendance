
import apiClient from '../axios';

export async function getTaskEmployees({params = {}} = {}){
  return apiClient.get('/tasks/employees', {params});
}

export async function updateTaskStatus(taskId, data){
  return apiClient.put(`/my-tasks/${taskId}/update-status`, data);
}
