import apiClient from '../axios';


export async function getTags(tag_type){
  return apiClient.get('/tags', {params: {tag_type}});
}
