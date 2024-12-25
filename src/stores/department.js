import { reactive, computed } from 'vue';
import apiClient from '../axios';

export function useDepartmentStore() {
  const state = reactive({
    departments: [], // List of departments
    department: null, // Single department details
    loading: false, // Loading state
    error: null, // Error state
  });

  const departments = computed(() => state.departments);
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);

  const fetchDepartments = async () => {
    state.loading = true;
    try {
      const response = await apiClient.get('/departments');
      state.departments = response.data;
      return state.departments;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch departments';
      console.error('Error fetching departments:', error);
    } finally {
      state.loading = false;
    }
  };

  const fetchDepartment = async (id) => {
    state.loading = true;
    try {
      const response = await apiClient.get(`/departments/${id}`);
      state.department = response.data;
      return state.department;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to fetch department';
      console.error(`Error fetching department with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  const createDepartment = async (data) => {
    state.loading = true;
    try {
      const response = await apiClient.post('/departments', data);
      state.departments.push(response.data); // Add new department to list
      return response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to create department';
      console.error('Error creating department:', error);
    } finally {
      state.loading = false;
    }
  };

  const updateDepartment = async (id, data) => {
    state.loading = true;
    try {
      const response = await apiClient.put(`/departments/${id}`, data);
      const index = state.departments.findIndex((d) => d.id === id);
      if (index !== -1) {
        state.departments[index] = response.data; // Update the department in the list
      }
      return response.data;
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to update department';
      console.error(`Error updating department with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  const deleteDepartment = async (id) => {
    state.loading = true;
    try {
      await apiClient.delete(`/departments/${id}`);
      state.departments = state.departments.filter((d) => d.id !== id); // Remove the department
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to delete department';
      console.error(`Error deleting department with id ${id}:`, error);
    } finally {
      state.loading = false;
    }
  };

  return {
    departments,
    loading,
    error,
    fetchDepartments,
    fetchDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
