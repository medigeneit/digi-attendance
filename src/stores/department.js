import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiClient from '../axios';

export const useDepartmentStore = defineStore('department', () => {
  const employees = ref([]); // Department লিস্ট
  const departments = ref([]); // Department লিস্ট
  const department = ref(null); // একক Department ডিটেইল
  const loading = ref(false); // লোডিং স্টেট
  const error = ref(null); // এরর স্টেট

  const fetchDepartments = async (companyId = null) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/departments', {
        params: { company_id: companyId },
      });
      departments.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'ডিপার্টমেন্ট লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching departments:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchDepartment = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/departments/${id}`);
      department.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `ডিপার্টমেন্ট (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching department with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const fetchDepartmentEmployee = async (payload) => {
    loading.value = true;
    error.value = null;
    try {   
      const response = await apiClient.get("department-employees", {
        params: payload,
      });
      employees.value = response?.data.employees
      
    } catch (err) {
      error.value = err.response?.data?.message || `ডিপার্টমেন্ট (ID: ${id}) লোড করতে ব্যর্থ হয়েছে।`;
      console.error(`Error fetching department with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };
  

  const createDepartment = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/departments', data);
      departments.value.push(response.data); // নতুন ডিপার্টমেন্ট লিস্টে যোগ করুন
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'ডিপার্টমেন্ট তৈরি করতে ব্যর্থ হয়েছে।';
      console.error('Error creating department:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateDepartment = async (id, data) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/departments/${id}`, data);
      const index = departments.value.findIndex((d) => d.id === id);
      if (index !== -1) {
        departments.value[index] = response.data; // আপডেট করা ডিপার্টমেন্ট
      }
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || `ডিপার্টমেন্ট (ID: ${id}) আপডেট করতে ব্যর্থ হয়েছে।`;
      console.error(`Error updating department with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const deleteDepartment = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/departments/${id}`);
      departments.value = departments.value.filter((d) => d.id !== id); // ডিপার্টমেন্ট রিমুভ করুন
    } catch (err) {
      error.value = err.response?.data?.message || `ডিপার্টমেন্ট (ID: ${id}) মুছতে ব্যর্থ হয়েছে।`;
      console.error(`Error deleting department with id ${id}:`, err);
    } finally {
      loading.value = false;
    }
  };

  return {
    departments: computed(() => departments.value),
    department: computed(() => department.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    employees,
    fetchDepartmentEmployee,
    fetchDepartments,
    fetchDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    
  };
});
