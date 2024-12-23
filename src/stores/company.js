import { ref } from 'vue';
import apiClient from '../axios';

export function useCompanyStore() {
  const companies = ref([]);
  const company = ref(null);

  const fetchCompanies = async () => {
    try {
      const response = await apiClient.get('/companies');
      companies.value = response.data;
      return response.data
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchCompany = async (id) => {
    try {
      const response = await apiClient.get(`/companies/${id}`);
      company.value = response.data;
    } catch (error) {
      console.error(`Error fetching company with id ${id}:`, error);
    }
  };

  const createCompany = async (companyData) => {
    try {
      const response = await apiClient.post('/companies', companyData);
      companies.value.push(response.data);
    } catch (error) {
      console.error('Error creating company:', error);
    }
  };

  const updateCompany = async (id, companyData) => {
    try {
      const response = await apiClient.put(`/companies/${id}`, companyData);
      const index = companies.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        companies.value[index] = response.data;
      }
    } catch (error) {
      console.error(`Error updating company with id ${id}:`, error);
    }
  };

  const deleteCompany = async (id) => {
    try {
      await apiClient.delete(`/companies/${id}`);
      companies.value = companies.value.filter((c) => c.id !== id);
    } catch (error) {
      console.error(`Error deleting company with id ${id}:`, error);
    }
  };

  return {
    companies,
    company,
    fetchCompanies,
    fetchCompany,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}
