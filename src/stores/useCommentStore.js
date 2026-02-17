import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useCommentStore = defineStore('comment', () => {
  const comments = ref([]);
  const comment = ref(null); // ✅ single comment
  const loading = ref(false);
  const action = ref('');
  const error = ref(null);

  // ✅ Fetch all comments
  const fetchComments = async (params) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get('/comments', {params});
      comments.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'কমেন্ট লোড করতে ব্যর্থ হয়েছে।';
    } finally {
      loading.value = false;
    }
  };

  // ✅ Fetch a single comment by ID (for edit)
  const fetchComment = async (id) => {
    action.value = 'fetching'
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/comments/${id}`);
      comment.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `কমেন্ট (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
    } finally {
      action.value = ''
      loading.value = false;
    }
  };

  // ✅ Create new comment
  const createComment = async (data) => {
    action.value = 'creating'
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/comments', data);
      const newComment = response.data.data;
      comments.value.push(newComment);
      return newComment;
    } catch (err) {
      error.value = err.response?.data?.message || 'কমেন্ট তৈরি করতে ব্যর্থ হয়েছে।';
      throw err
    } finally {
      loading.value = false;
      action.value = ''
    }
  };

  // ✅ Update comment
  const updateComment = async (id, data) => {
    action.value = 'updating'
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/comments/${id}`, data);
      const index = comments.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        comments.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || `কমেন্ট (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      throw err;
    } finally {
      loading.value = false;
      action.value = ''
    }
  };

  // ✅ Delete comment
  const deleteComment = async (id) => {
    action.value = 'deleting'
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/comments/${id}`);
      comments.value = comments.value.filter((c) => c.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `কমেন্ট (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      throw err;
    } finally {
      loading.value = false;
      action.value = '';
    }
  };

  // ✅ Acknowledge mention
  const acknowledgeComment = async (id) => {
    action.value = 'acknowledging'
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post(`/comments/${id}/acknowledge`);
      const index = comments.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        comments.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || `কমেন্ট (ID: ${id}) একনলেজ করতে ব্যর্থ হয়েছে।`;
      throw err;
    } finally {
      loading.value = false;
      action.value = ''
    }
  };

  return {
    comments: computed(() => comments.value),
    comment: computed(() => comment.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    action: computed(() => action.value),
    fetchComments,
    fetchComment,     // ✅ added
    createComment,
    updateComment,    // ✅ added
    deleteComment,
    acknowledgeComment,
  };
});
