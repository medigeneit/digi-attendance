import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../axios';

export const useNoticeStore = defineStore('notice', () => {
  // State
  const notices = ref([]);
  const policies = ref([]);
  const notice = ref({});
  const error = ref(null);
  const isLoading = ref(false); // লোডিং স্টেট
  const feedbacks = ref([])
  const totalFeedbacks = ref(0)
  // Actions


  const fetchFeedbacks = async (noticeId, payload = {}) => {
    const res = await apiClient.get(`/notice/feedbacks/${noticeId}`, payload)
    feedbacks.value = res.data.data.data
    totalFeedbacks.value = res.data.data.total
  }

  const fetchUserNotices = async () => {
    try {
      isLoading.value = true; // লোডিং শুরু
      const response = await apiClient.get('/user/notices');
      notices.value = response?.data?.notices;
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false; // লোডিং শেষ
    }
  };

  const fetchPolices = async () => {
    try {
      isLoading.value = true; // লোডিং শুরু
      const response = await apiClient.get('/policies');
      policies.value = response?.data?.polices;
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false; // লোডিং শেষ
    }
  };

  const fetchNotices = async () => {
    try {
      isLoading.value = true; // লোডিং শুরু
      const response = await apiClient.get('/notices');
      notices.value = response?.data;
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false; // লোডিং শেষ
    }
  };

  const fetchNotice = async (id) => {
    try {
      isLoading.value = true;
      const response = await apiClient.get(`/notices/${id}`);
      const data = response.data;
      if(data) {
        notice.value = data;
      }
      error.value = null;
      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };
  const fetchNoticeDetails = async (id) => {
    try {
      isLoading.value = true;
      const response = await apiClient.get(`/notices/details/${id}`);
      const data = response.data;
      if(data) {
        notice.value = data;
      }
      error.value = null;
      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  const fetchFileUpload = async (payload) => {
    try {
      isLoading.value = true;
      const response = await apiClient.post('file-upload', payload, {
        headers: {
          'Content-Type': 'multipart/form-data'  // ✅ Content-Type ঠিক রাখা
        }
      })
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong'
    } finally {
      isLoading.value = false
    }
  };

  const createNotice = async (payload) => {
    try {
      isLoading.value = true;
      const response = await apiClient.post('/notices', payload);
      notices.value.push(response.data.notices);
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  const createNoticeFeedback = async (id, payload) => {
    try {
      isLoading.value = true;
      return await apiClient.post(`/user/notice/feedback/${id}`, payload);
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  const updateNotice = async (id, payload) => {
    try {
      isLoading.value = true;
      console.log({payload});
      
      const response = await apiClient.put(`/notices/${id}`, payload);
      const index = users.value.findIndex((u) => u.id === id);
      if (index !== -1) {
        notice.value[index] = response.data.notice;
      }
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
    } finally {
      isLoading.value = false;
    }
  };

  // Return state, getters, and actions
  return {
    notices,
    notice,
    error,
    isLoading,
    policies,
    feedbacks,
    totalFeedbacks,
    fetchPolices,
    fetchFileUpload,
    createNoticeFeedback,
    fetchNotices,
    fetchNotice,
    createNotice,
    updateNotice,
    fetchUserNotices,
    fetchNoticeDetails,
    fetchFeedbacks
  };
});
