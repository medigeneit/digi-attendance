import { reactive, computed } from 'vue';
import apiClient from '../axios';

export function useCompanyStore() {
  const state = reactive({
    companies: [], // List of companies
    company: null, // Single company details
    loading: false, // Loading state
    error: null, // Error state
  });

  const companies = computed(() => state.companies);
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);

  const fetchCompanies = async () => {
    state.loading = true;
    try {
      const response = await apiClient.get('/companies');
      state.companies = response.data;
      return state.companies;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch companies';
    } finally {
      state.loading = false;
    }
  };

  const fetchCompany = async (id) => {
    state.loading = true;
    try {
      const response = await apiClient.get(`/companies/${id}`);
      state.company = response.data;
      return state.company;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch company';
    } finally {
      state.loading = false;
    }
  };

  const createCompany = async (data) => {
    state.loading = true;
    try {
      const response = await apiClient.post('/companies', data);
      state.companies.push(response.data);
      return response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to create company';
    } finally {
      state.loading = false;
    }
  };

  const updateCompany = async (id, data) => {
    state.loading = true;
    try {
      const response = await apiClient.put(`/companies/${id}`, data);
      const index = state.companies.findIndex((company) => company.id === id);
      if (index !== -1) {
        state.companies[index] = response.data;
      }
      return response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to update company';
    } finally {
      state.loading = false;
    }
  };

  const deleteCompany = async (id) => {
    state.loading = true;
    try {
      await apiClient.delete(`/companies/${id}`);
      state.companies = state.companies.filter((company) => company.id !== id);
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to delete company';
    } finally {
      state.loading = false;
    }
  };

  return {
    companies,
    loading,
    error,
    fetchCompanies,
    fetchCompany,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}
