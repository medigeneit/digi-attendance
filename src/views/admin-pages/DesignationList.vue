<script setup>
import { ref, onMounted } from 'vue'
import { useDesignationStore } from '@/stores/designation'
import { useToast } from 'vue-toastification'

import DesignationModal from '@/components/DesignationModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const designationStore = useDesignationStore()
const toast = useToast()

const designations = designationStore.designations
const isLoading = designationStore.loading

const showDesignationModal = ref(false)
const showDeleteModal = ref(false)
const selectedDesignation = ref(null)

const openAddModal = () => {
  selectedDesignation.value = null
  showDesignationModal.value = true
}

const closeDesignationModal = () => {
  showDesignationModal.value = false
}

const openEditModal = (designation) => {
  selectedDesignation.value = designation
  showDesignationModal.value = true
}

const openDeleteModal = (designation) => {
  selectedDesignation.value = designation
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const handleSave = async (designation) => {
  try {
    if (designation.id) {
      await designationStore.updateDesignation(designation.id, designation)
      toast.success('Designation updated successfully!')
    } else {
      await designationStore.createDesignation(designation)
      toast.success('Designation added successfully!')
    }
  } catch (error) {
    toast.error('Failed to save designation!')
    console.error('Error handling save:', error)
  } finally {
    await fetchDesignations()
    closeDesignationModal()
  }
}

const handleDelete = async () => {
  if (!selectedDesignation.value || !selectedDesignation.value.id) {
    toast.error('Invalid designation selected for deletion!')
    return
  }
  try {
    await designationStore.deleteDesignation(selectedDesignation.value.id)
    toast.success('Designation deleted successfully!')
  } catch (error) {
    toast.error('Failed to delete designation!')
    console.error('Error deleting designation:', error)
  } finally {
    await fetchDesignations()
    closeDeleteModal()
  }
}

const fetchDesignations = async () => {
  try {
    await designationStore.fetchDesignations()
  } catch (error) {
    toast.error('Failed to fetch designations!')
    console.error('Error fetching designations:', error)
  }
}

onMounted(async () => {
  await fetchDesignations()
})
</script>

<template>
  <div class="my-container space-y-2">
    <div class="flex justify-between items-center">
      <h1 class="title-lg">Designation List</h1>
      <button class="btn-2" @click="openAddModal">Add New</button>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Title</th>
            <th class="py-3 px-2 text-left">Grade</th>
            <th class="py-3 px-2 text-center">Company</th>
            <th class="py-3 px-2 text-center">Status</th>
            <th class="py-3 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm font-light">
          <tr v-if="isLoading">
            <td colspan="5">
              <LoaderView />
            </td>
          </tr>
          <template v-else-if="designations && designations.length">
            <tr
              v-for="designation in designations"
              :key="designation.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ designation.title }}</p>
              </td>
              <td class="py-3 px-2 text-left whitespace-nowrap">
                <p class="font-medium">{{ designation.grade }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ designation?.company?.name }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ designation.status }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex item-center justify-center gap-4">
                  <button
                    @click="openEditModal(designation)"
                    class="text-blue-600 hover:text-blue-800"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="openDeleteModal(designation)"
                    class="text-red-600 hover:text-red-800"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="5" class="text-center text-red-500 py-4">No designations found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <DesignationModal
      :show="showDesignationModal"
      :designation="selectedDesignation"
      @close="closeDesignationModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Designation'"
      :message="`Are you sure you want to delete ${selectedDesignation?.title}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
