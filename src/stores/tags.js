import { getTags } from '@/services/tag';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTagStore = defineStore('tags', () => {
  // State
  const tags = ref([])

  const fetchTags = async ( tag_type ) => {
    tags.value = (await getTags(tag_type))?.data?.tags || []
  }

  return {
    tags,
    fetchTags
  }


});
