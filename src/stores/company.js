import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useCompanyStore = defineStore('company', () => {
  const companies = ref([]); // Company লিস্ট
  const employees = ref([]); // Company লিস্ট
  const company = ref(null); // একক Company ডিটেইল
  const loading = ref(false); // লোডিং স্টেট
  const error = ref(null); // এরর স্টেট

  const fetchCompanies = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/companies');
      companies.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'কোম্পানি লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching companies:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchCompany = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/companies/${id}`);
      company.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `কোম্পানি (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching company with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const createCompany = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/companies', data);
      companies.value.push(response.data); // নতুন কোম্পানি লিস্টে যোগ করুন
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'কোম্পানি তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating company:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateCompany = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/companies/${id}`, data);
      const index = companies.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        companies.value[index] = response.data; // আপডেট করা কোম্পানি
      }
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `কোম্পানি (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating company with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const fetchEmployee = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/companies/${id}/employees`);
      employees.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `কোম্পানি (ID: ${id}) এর এমপ্লয়ী লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching department with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteCompany = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/companies/${id}`);
      companies.value = companies.value.filter((c) => c.id !== id); // কোম্পানি রিমুভ করুন
    } catch (err) {
      error.value = err.response?.data?.message || `কোম্পানি (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting company with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    companies: computed(() => companies.value),
    company: computed(() => company.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    employees,
    fetchEmployee,
    fetchCompanies,
    fetchCompany,
    createCompany,
    updateCompany,
    deleteCompany,
  };
});
