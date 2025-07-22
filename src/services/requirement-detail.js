
import { objectToQuery } from '@/libs/url';
import apiClient from '../axios';

export async function getRequirementDetails(requirementId,{params = {}} = {}){
  return apiClient.get(`/requirements/${requirementId}/details`, {params});
}

export async function addRequirementDetail(requirementId, data){
  return apiClient.post(`/requirements/${requirementId}/details`, data);
}

export async function findRequirementDetail(requirementId, detailId, {params = {}} = {}){
  return apiClient.get(`/requirements/${requirementId}/details/${detailId}`, {params});
}

export async function updateRequirementDetail(requirementId, detailId, data){
  return apiClient.put(`/requirements/${requirementId}/details/${detailId}`, data);
}

export async function deleteRequirementDetail(requirementId, detailId, {params = {}} = {}){
  const query = objectToQuery(params)
  return apiClient.delete(`/requirements/${requirementId}/details/${detailId}${query ? '?' + query :''}`);
}

