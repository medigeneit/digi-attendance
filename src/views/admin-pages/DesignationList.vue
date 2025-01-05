<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDesignationStore } from '@/stores/designation'
import { useToast } from 'vue-toastification'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import DesignationModal from '@/components/DesignationModal.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const designationStore = useDesignationStore()
const toast = useToast()

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

const groupedDesignations = computed(() => {
  const grouped = {}
  designationStore.designations.forEach((designation) => {
    const companyName = designation?.company?.name || 'Unknown Company'
    if (!grouped[companyName]) {
      grouped[companyName] = []
    }
    grouped[companyName].push(designation)
  })
  return grouped
})

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

    <div v-if="designationStore.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-for="(designations, companyName) in groupedDesignations" :key="companyName">
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
                v-for="designation in designations"
                :key="designation.id"
                class="border-b border-gray-200 hover:bg-gray-100"
              >
                <td class="py-3 px-2 text-left">{{ designation.title }}</td>
                <td class="py-3 px-2 text-left whitespace-nowrap">{{ designation.grade }}</td>
                <td class="py-3 px-2 text-center">{{ designation.status }}</td>
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
            </tbody>
          </table>
        </div>
      </div>
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
