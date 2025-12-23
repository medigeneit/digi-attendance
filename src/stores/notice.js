import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../axios';

export const useNoticeStore = defineStore('notice', () => {
  // State
  const users = ref([]);
  const notices = ref([]);
  const policies = ref([]);
  const notice = ref({});
  const error = ref(null);
  const isLoading = ref(false); // লোডিং স্টেট
  const feedbacks = ref([])
  const totalFeedbacks = ref(0)
  // Actions


  const fetchFeedbacks = async (noticeId, payload = {}) => {
    const res = await apiClient.get(`/notice/${noticeId}/feedbacks`, payload)
    feedbacks.value = res?.data?.data
    totalFeedbacks.value = res?.data?.meta?.total
    notice.value = res?.data?.notice
  }

  const downloadFeedbackUserExcel = async (noticeId, queryParams = {}) => {
    isLoading.value = true;
    try {
      const response = await apiClient.get(`/notice/feedbacks/${noticeId}?flag=excel`, {
        params: queryParams,
        responseType: 'blob', // Important for downloading binary data
      });
  
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `notice_feedback_users_${noticeId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  };

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
      notices.value = response?.data?.data ?? response?.data ?? [];
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
      isLoading.value = true
      error.value = null

      // 1) create WITHOUT file (pure JSON)
      const { data } = await apiClient.post('/notices', {
        title: payload.title,
        type: payload.type,
        description: payload.description,
        published_at: payload.published_at,
        expired_at: payload.expired_at,
        receiver_type: payload.receiver_type,
        all_companies: !!payload.all_companies,
        all_departments: !!payload.all_departments,
        all_employees: !!payload.all_employees,
        company_ids: payload.company_ids || [],
        department_ids: payload.department_ids || [],
        employee_ids: payload.employee_ids || [],
      })

      let created = data?.notice

      // 2) if file present → attach via /notices/{id}/file
      if (created?.id && payload.file instanceof Blob) {
        const fd = new FormData()
        fd.append('file', payload.file, payload.file.name || 'attachment')

        const up = await apiClient.post(`/notices/${created.id}/file`, fd, {
          // খুব গুরুত্বপূর্ণ: FormData যেন stringify না হয়
          transformRequest: [(d) => d],
          // Content-Type সেট কোরো না; ব্রাউজার boundary সহ সেট করবে
          headers: {},
        })

        created = up.data?.notice || created
      }

      if (created) {
        // optimistic update
        notices.value.unshift(created)
      }

      return created
    } catch (err) {
      const apiMsg = err?.response?.data?.message
      const valErrors = err?.response?.data?.errors
      error.value = valErrors
        ? Object.values(valErrors)?.[0]?.[0] || apiMsg
        : (apiMsg || err?.message || 'Something went wrong')
      throw err
    } finally {
      isLoading.value = false
    }
  }

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

  const updateNoticeFile = async (id, file, { onProgress, signal } = {}) => {
   const fd = new FormData()
      fd.append('file', file, file.name || 'attachment')

      const { data } = await apiClient.post(`/notices/${id}/file`, fd, {
        transformRequest: [(d) => d],
        headers: {},
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            const pct = Math.round((evt.loaded * 100) / evt.total)
            onProgress(pct)
          }
        },
        signal, // AbortController signal
      })
      return data?.notice
  }

  

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
    fetchFeedbacks,
    downloadFeedbackUserExcel,
    updateNoticeFile
  };
});
