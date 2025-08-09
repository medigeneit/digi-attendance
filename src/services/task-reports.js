
import apiClient from '../axios';



export async function getAllTaskReports(date, params){
  return apiClient.get(`/monthly-task-reports/${date}`, {params});
}

export async function getMyTaskReports(date, params){
  return apiClient.get(`/my-monthly-task-reports/${date}`, {params});
}

