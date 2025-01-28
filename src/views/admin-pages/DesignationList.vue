<script setup>
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import DesignationModal from '@/components/DesignationModal.vue'
import { useDesignationStore } from '@/stores/designation'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

const designationStore = useDesignationStore()
const toast = useToast()
const { designations, loading, message, error } = storeToRefs(designationStore)
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
      toast.success(message)
    } else {
      await designationStore.createDesignation(designation)
      toast.success(message)
    }
    await designationStore.fetchDesignations()
  } catch (error) {
    toast.error('Failed to save designation!')
    console.error('Error handling save:', error)
  } finally {
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
    closeDeleteModal()
  }
}

onMounted(async () => {
  try {
    await designationStore.fetchDesignations()
  } catch (error) {
    toast.error('Failed to fetch designations!')
    console.error('Error fetching designations:', error)
  }
})
</script>

<template>
  <div class="my-container space-y-4">
    <!-- হেডার -->
    <HeaderWithButtons title="Designation List" @add="openAddModal" />
    
    <div v-if="loading" class="text-center py-4">
      <LoaderView />
    </div>
    
    <div v-else class="space-y-4">
      <div class="space-y-4" v-if="true">
        <div v-for="(designationArray, companyName) in designations" :key="companyName">
          <!-- কোম্পানির নাম -->
          <h2 class="title-md">{{ companyName }}</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
              <thead>
                <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
                  <th class="py-3 px-2 text-left">Title</th>
                  <th class="py-3 px-2 text-left">Grade</th>
                  <th class="py-3 px-2 text-center">Status</th>
                  <th class="py-3 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody class="text-gray-600 text-sm">
                <tr
                  v-for="item in designationArray"
                  :key="item.id"
                  class="border-b border-gray-200 hover:bg-gray-100"
                >
                  <td class="py-3 px-2 text-left">{{ item.title }}</td>
                  <td class="py-3 px-2 text-left whitespace-nowrap">{{ item.grade }}</td>
                  <td class="py-3 px-2 text-center">{{ item.status }}</td>
                  <td class="py-3 px-2 text-center">
                    <div class="flex item-center justify-center gap-4">
                      <button
                        @click="openEditModal(item)"
                        class="text-blue-600 hover:text-blue-800"
                      >
                        <i class="fas fa-edit"></i>
                      </button>
                      <button
                        @click="openDeleteModal(item)"
                        class="text-red-600 hover:text-red-800"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-4 italic text-xl text-gray-400">No data found</div>
    </div>

    <!-- মডাল -->
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
