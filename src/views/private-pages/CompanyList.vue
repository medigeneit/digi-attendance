<script setup>
import { ref, onMounted } from 'vue';
import { useCompanyStore } from '@/stores/company';
import { useToast } from 'vue-toastification';

import CompanyModal from '@/components/company/CompanyModal.vue';
import DeleteModal from '@/components/common/DeleteModal.vue';
import LoaderView from '@/components/common/LoaderView.vue';

const companyStore = useCompanyStore();
const toast = useToast();

const companies = companyStore.companies; // Reactive companies list from store
const isLoading = companyStore.loading; // Loading state from store

const showCompanyModal = ref(false);
const showDeleteModal = ref(false);
const selectedCompany = ref(null);

const openAddModal = () => {
  selectedCompany.value = null;
  showCompanyModal.value = true;
};

const closeCompanyModal = () => {
  showCompanyModal.value = false;
};

const openEditModal = (company) => {
  selectedCompany.value = company;
  showCompanyModal.value = true;
};

const openDeleteModal = (company) => {
  selectedCompany.value = company;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
};

const handleSave = async (company) => {
  try {
    if (company.id) {
      await companyStore.updateCompany(company.id, company);
      toast.success('Company updated successfully!');
    } else {
      await companyStore.createCompany(company);
      toast.success('Company added successfully!');
    }
  } catch (error) {
    toast.error('Failed to save company!');
    console.error('Error handling save:', error);
  } finally {
    await fetchCompanies();
    closeCompanyModal();
  }
};

const handleDelete = async () => {
  if (!selectedCompany.value || !selectedCompany.value.id) {
    toast.error('Invalid company selected for deletion!');
    return;
  }
  try {
    await companyStore.deleteCompany(selectedCompany.value.id); 
    toast.success('Company deleted successfully!');
  } catch (error) {
    toast.error('Failed to delete company!');
    console.error('Error deleting company:', error);
  } finally {
    await fetchCompanies();
    closeDeleteModal();
  }
};

const fetchCompanies = async () => {
  try {
    await companyStore.fetchCompanies();
  } catch (error) {
    toast.error('Failed to fetch companies!');
    console.error('Error fetching companies:', error);
  }
};

onMounted(async () => {
  await fetchCompanies();
});
</script>

<template>
  <div class="my-container space-y-2">
    <div class="flex justify-between items-center">
      <h1 class="title-lg">Company List</h1>
      <button class="btn-2" @click="openAddModal">Add New</button>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">Short Name</th>
            <th class="py-3 px-2 text-center">Phone</th>
            <th class="py-3 px-2 text-center">Email</th>
            <th class="py-3 px-2 text-center">Status</th>
            <th class="py-3 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm font-light">
          <tr v-if="isLoading">
            <td colspan="6">
              <LoaderView />
            </td>
          </tr>
          <template v-else-if="companies && companies.length">
            <tr
              v-for="company in companies"
              :key="company.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ company.name }}</p>
              </td>
              <td class="py-3 px-2 text-left whitespace-nowrap">
                <p class="font-medium">{{ company.short_name }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ company.phone }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ company.email }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ company.status }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex item-center justify-center gap-4">
                  <button @click="openEditModal(company)" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click="openDeleteModal(company)" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="6" class="text-center text-red-500 py-4">No companies found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Company Modal -->
    <CompanyModal
      :show="showCompanyModal"
      :company="selectedCompany"
      @close="closeCompanyModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Company'"
      :message="`Are you sure you want to delete ${selectedCompany?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
