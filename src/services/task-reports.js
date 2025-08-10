
import apiClient from '../axios';



export async function getAllTaskReports( params){
  return apiClient.get(`/monthly-task-reports`, {params});
}

export async function getMyTaskReports(  params){
  return apiClient.get(`/my-monthly-task-reports`, {params});
}

