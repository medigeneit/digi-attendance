<script setup>
import { ref, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'

import AddCompany from '@/components/company/AddCompany.vue'
import EditCompany from '@/components/company/EditCompany.vue'
import DeleteCompany from '@/components/company/DeleteCompany.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const companyStore = useCompanyStore()

const showAddModal = ref(false)
const companies = ref([])
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedCompany = ref(null)
const isLoading = ref(true)

const openAddModal = () => (showAddModal.value = true)

const closeAddModal = async () => {
  showAddModal.value = false
  await companyStore.fetchCompanies()
  companies.value = response
}

const openEditModal = (company) => {
  selectedCompany.value = company
  showEditModal.value = true
}

const closeEditModal = async () => {
  showEditModal.value = false
  await companyStore.fetchCompanies()
  companies.value = response 
}

const openDeleteModal = (company) => {
  selectedCompany.value = company
  showDeleteModal.value = true
}

const closeDeleteModal = async () => {
  showDeleteModal.value = false
  await companyStore.fetchCompanies()
  companies.value = response
}

onMounted(async () => {
  try {
    let response = await companyStore.fetchCompanies()
    companies.value = response
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="my-container space-y-2">
    <div class="flex justify-between items-center">
      <h1 class="title-lg">Company List</h1>
      <button class="btn-2" @click="openAddModal">Add New</button>
    </div>

    <LoaderView v-if="isLoading" />

    <div v-else class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">Short Name</th>
            <th class="py-3 px-2 text-left">Address</th>
            <th class="py-3 px-2 text-center">Phone</th>
            <th class="py-3 px-2 text-center">Email</th>
            <th class="py-3 px-2 text-center">Status</th>
            <th class="py-3 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm font-light">
          <template v-if="companies.length">
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
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ company.address }}</p>
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
            <td colspan="7" class="text-center text-red-500 py-4">No companies found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <AddCompany v-if="showAddModal" @close="closeAddModal" />
  <EditCompany v-if="showEditModal" :company="selectedCompany" @close="closeEditModal" />
  <DeleteCompany v-if="showDeleteModal" :company="selectedCompany" @close="closeDeleteModal" />
</template>
