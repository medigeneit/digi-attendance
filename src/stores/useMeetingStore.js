import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useMeetingStore = defineStore('meeting', () => {
  const meetings = ref([]);
  const meeting = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const assignUsers = async (meetingId, user_ids) => {
    loading.value = true;
    error.value = null;

    try {
      await apiClient.post(`/meetings/${meetingId}/assign-users`, { user_ids });
      await fetchEditMeeting(meetingId); // refresh meeting details
    } catch (err) {
      error.value = err.response?.data?.message || 'Assign users failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchMeetings = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/meetings');
      meetings.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'মিটিং লোড করতে ব্যর্থ হয়েছে।';
    } finally {
      loading.value = false;
    }
  };

  // Fetch a single meeting (edit method)
  const fetchEditMeeting = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/meetings/${id}`);
      meeting.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'মিটিং লোড করতে ব্যর্থ হয়েছে।';
    } finally {
      loading.value = false;
    }
  };

  const createMeeting = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/meetings', data);
      meetings.value.push(response.data.data);
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'মিটিং তৈরি করতে ব্যর্থ হয়েছে।';
    } finally {
      loading.value = false;
    }
  };

  // Update meeting method
  const updateMeeting = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/meetings/${id}`, data);
      const index = meetings.value.findIndex((m) => m.id === id);
      if (index !== -1) {
        meetings.value[index] = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || `মিটিং (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
    } finally {
      loading.value = false;
    }
  };

  const deleteMeeting = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/meetings/${id}`);
      meetings.value = meetings.value.filter((m) => m.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `মিটিং (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
    } finally {
      loading.value = false;
    }
  };

  return {
    meetings: computed(() => meetings.value),
    meeting: computed(() => meeting.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchMeetings,
    fetchEditMeeting, // newly added
    createMeeting,
    updateMeeting,    // newly added
    deleteMeeting,
    assignUsers,
  };
});
