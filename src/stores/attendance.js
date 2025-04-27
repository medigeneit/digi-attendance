import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../axios';

export const useAttendanceStore = defineStore('attendance', () => {
  const monthlyLogs = ref([]);
  const dailyLogs = ref([]);
  const dailyLateLogs = ref([]);
  const summary = ref(null);
  const monthly_company_summary = ref(null);
  const selectedMonth = ref(new Date().toISOString().substring(0, 7));
  const selectedDate = ref(new Date().toISOString().substring(0, 10));
  const error = ref(null);
  const isLoading = ref(false);

  const getMonthlyAttendanceByShift = async (userId, month) => {
    if (!userId || !month) {
      error.value = 'Invalid user ID or month';
      return;
    }
    console.log('sdfsdf', userId);
    
    isLoading.value = true;
    try {
      const response = await apiClient.get(`/user/${userId}/attendance/monthly/${month}`);
      monthlyLogs.value = response.data.monthly_logs; // শুধু logs
      summary.value = response.data.summary; // শুধু summary
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  };


  const getTodayAttendanceReport = async (companyId, departmentId, employee_id , category, month, status) => {
    isLoading.value = true;
    try {
      const params = {companyId, departmentId, employee_id, category, month, status}
      const response = await apiClient.get("/attendance/today", { params });
      dailyLogs.value = response.data; 
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  };

  const getAttendanceLateReport = async (company_id, employee_id, month) => {
    isLoading.value = true;
    try {
      const params = {company_id,employee_id, month}

      console.log({params});
      
      const response = await apiClient.get("/monthly/attendance/late-reports", { params });
      dailyLateLogs.value = response.data; 
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  };

  // const getAttendanceLateReport = async (company_id, employee_id, month) => {
  //   isLoading.value = true;
  //   try {
  //     const params = {company_id,employee_id, month}

  //     console.log({params});
      
  //     const response = await apiClient.get("/attendance/late-reports", { params });
  //     dailyLateLogs.value = response.data; 
  //     error.value = null;
  //   } catch (err) {
  //     error.value = err.response?.data?.message || 'Something went wrong';
  //     console.error(error.value);
  //   } finally {
  //     isLoading.value = false;
  //   }
  // };

  const getMonthlyAttendanceSummaryReport = async (company_id, employee_id, category, month) => {
    if (!company_id || !month) {
      error.value = 'Invalid user ID or month';
      return;
    }
    isLoading.value = true;
    try {
      const params = { company_id, employee_id, category, month}
      const response = await apiClient.get(`/attendance/monthly-summary-reports`, { params });
      monthly_company_summary.value = response.data; 
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Something went wrong';
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  };

  const downloadPDF = async (company_id, category, month, flag = 0) => {
    
    if (!company_id || !month) {
      error.value = 'Invalid user ID or month';
      return;
    }

    isLoading.value = true;

    try {
      const params = { company_id, category, month}
      const response = await apiClient.get(`/attendance/monthly-summary-reports?flag=pdf`, {
          params,
          responseType: 'blob', // Important for file downloads
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${month} attendance_summary.pdf`); // File name
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

  const attendanceDownloadPdf = async (companyId, employee_id , category, month, status) => {
    // if (!company_id || !month) {
    //   error.value = 'Invalid user ID or month';
    //   return;
    // }
    isLoading.value = true;
    try {
      const params = { companyId, employee_id , category, month, status}
      const response = await apiClient.get(`/attendance/today?flag=pdf`, {
          params,
          responseType: 'blob', // Important for file downloads
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${month} attendance_summary.pdf`); // File name
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

  const downloadExcel = async (company_id, category, month) => {
    
    if (!company_id || !month) {
      error.value = 'Invalid company ID or month';
      return;
    }
    isLoading.value = true;
    
    try {
      
      const params = { company_id, category, month };

      console.log({params});

        const response = await apiClient.get(`/attendance/monthly-summary-reports?flag=excel`, {
            params,
            responseType: 'blob', // Important for file downloads
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${month} attendance_summary.xlsx`); // File name
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

  const attendanceDownloadExcel = async (companyId, employee_id , category, month, status) => {
    isLoading.value = true;
    try {
        const params = { companyId, employee_id , category, month, status };
        const response = await apiClient.get(`/attendance/today?flag=excel`, {
            params,
            responseType: 'blob', // Important for file downloads
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${month} attendance_summary.xlsx`); // File name
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

  return {
    monthlyLogs,
    dailyLateLogs,
    summary,
    monthly_company_summary,
    selectedMonth,
    selectedDate,
    error,
    isLoading,
    dailyLogs,
    getMonthlyAttendanceByShift,
    getTodayAttendanceReport,
    getAttendanceLateReport,
    getMonthlyAttendanceSummaryReport,
    downloadExcel,
    downloadPDF,
    attendanceDownloadExcel,
    attendanceDownloadPdf
  };
});

