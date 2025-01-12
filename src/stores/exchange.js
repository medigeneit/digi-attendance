import { ref } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '@/axios'; // Ensure you have configured Axios as `apiClient`

export const useExchangeStore = defineStore('exchange', () => {
  const exchanges = ref([]);
  const exchange = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Fetch all exchanges
  async function fetchExchanges() {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/exchanges');
      exchanges.value = response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch exchanges';
    } finally {
      loading.value = false;
    }
  }

  // Fetch a single exchange by ID
  async function fetchExchange(id) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/exchanges/${id}`);
      exchange.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to fetch exchange with ID ${id}`;
    } finally {
      loading.value = false;
    }
  }

  // Create a new exchange
  async function createExchange(payload) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/exchanges', payload);
      exchanges.value.push(response.data);
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create exchange';
    } finally {
      loading.value = false;
    }
  }

  // Update an existing exchange
  async function updateExchange(id, payload) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/exchanges/${id}`, payload);
      const index = exchanges.value.findIndex((ex) => ex.id === id);
      if (index !== -1) {
        exchanges.value[index] = response.data;
      }
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update exchange with ID ${id}`;
    } finally {
      loading.value = false;
    }
  }

  // Delete an exchange
  async function deleteExchange(id) {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/exchanges/${id}`);
      exchanges.value = exchanges.value.filter((ex) => ex.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to delete exchange with ID ${id}`;
    } finally {
      loading.value = false;
    }
  }

  // Accept Exchange by Handover
  async function handoverAccept(id) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post(`/exchanges/${id}/handover-accept`);
      exchange.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to accept handover for exchange ID ${id}`;
    } finally {
      loading.value = false;
    }
  }

  // Accept Exchange by In-Charge
  async function inChargeAccept(id) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post(`/exchanges/${id}/in-charge-accept`);
      exchange.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to accept in-charge for exchange ID ${id}`;
    } finally {
      loading.value = false;
    }
  }

  // Accept Exchange by Recommend
  async function recommendByAccept(id) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post(`/exchanges/${id}/recommend-accept`);
      exchange.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to recommend exchange ID ${id}`;
    } finally {
      loading.value = false;
    }
  }

  // Approve Exchange
  async function approveExchange(id) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post(`/exchanges/${id}/approve`);
      exchange.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to approve exchange ID ${id}`;
    } finally {
      loading.value = false;
    }
  }

  // Reject Exchange
  async function rejectExchange(id, rejectionReason) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post(`/exchanges/${id}/reject`, {
        rejection_reason: rejectionReason,
      });
      exchange.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to reject exchange ID ${id}`;
    } finally {
      loading.value = false;
    }
  }

  return {
    exchanges,
    exchange,
    loading,
    error,
    fetchExchanges,
    fetchExchange,
    createExchange,
    updateExchange,
    deleteExchange,
    handoverAccept,
    inChargeAccept,
    recommendByAccept,
    approveExchange,
    rejectExchange,
  };
});
