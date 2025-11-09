
import { objectToQuery } from '@/libs/url';
import apiClient from '../axios';

export async function getRequirements({params = {}} = {}){
  return apiClient.get('/requirements', {params});
}

export async function getTasksWithRequirement({params = {}} = {}){
  return apiClient.get('/tasks-with-requirement', {params});
}

export async function getMyTasksWithRequirement({params = {}} = {}){
  return apiClient.get('/my-tasks-with-requirement', {params});
}


export async function addRequirement(data) {
  return apiClient.post('/requirements', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export async function addRequirementAttachments(requirementId,data) {
  return apiClient.post(`/requirements/${requirementId}/attachments`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export async function findRequirement(requirementId, {params = {}} = {}){
  return apiClient.get(`/requirements/${requirementId}`, {params});
}

export async function updateRequirement(requirementId, data){
  return apiClient.put(`/requirements/${requirementId}`, data);
}


export async function updateRequirementFeedback(requirementId, feedback){
  return apiClient.put(`/requirements/${requirementId}/update-feedback`, {feedback});
}


export async function submitRequirement(requirementId, data){
  return apiClient.put(`/requirements/${requirementId}/submit`, data);
}


export async function closeRequirement(requirementId, note){
  return apiClient.put(`/requirements/${requirementId}/close`, {note});
}

export async function reOpenRequirement(requirementId , note){
  return apiClient.put(`/requirements/${requirementId}/re-open`, {note});
}

export async function deleteRequirement(taskId, {params = {}} = {}){
  const query = objectToQuery(params)
  return apiClient.delete(`/requirements/${taskId}${query ? '?' + query :''}`);
}

