
import { objectToQuery } from '@/libs/url';
import apiClient from '../axios';

export async function getRequirements({params = {}} = {}){
  return apiClient.get('/requirements', {params});
}

export async function addRequirement(data){
  return apiClient.post('/requirements', data);
}

export async function findRequirement(requirementId, {params = {}} = {}){
  return apiClient.get(`/requirements/${requirementId}`, {params});
}

export async function updateRequirement(requirementId, data){
  return apiClient.put(`/requirements/${requirementId}`, data);
}

export async function submitRequirement(requirementId, data){
  return apiClient.put(`/requirements/${requirementId}/submit`, data);
}

export async function deleteRequirement(taskId, {params = {}} = {}){
  const query = objectToQuery(params)
  return apiClient.delete(`/requirements/${taskId}${query ? '?' + query :''}`);
}

