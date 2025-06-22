import { defineStore } from 'pinia';
import apiClient from '../axios';

export const useTaskUserStore = defineStore('task-user', () => {
   

  const updateUserStartDate = async (taskId, userId, date) => {
      return await apiClient.patch(`/task-user/task/${taskId}/user/${userId}/update-start-date/${date}` ); 
  };

  const updateUserFinishDate = async (taskId, userId, date) => {
      return await apiClient.patch(`/task-user/task/${taskId}/user/${userId}/update-finish-date/${date}` ); 
  };
 


  return {
    updateUserStartDate,
    updateUserFinishDate
  };
});
