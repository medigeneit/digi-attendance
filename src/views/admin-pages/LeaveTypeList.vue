<script setup>
import { ref, onMounted } from 'vue'
import { useLeaveTypeStore } from '@/stores/leave-type'
import { useToast } from 'vue-toastification'
import LeaveTypeModal from '@/components/LeaveTypeModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const leaveTypeStore = useLeaveTypeStore()
const toast = useToast()

const showLeaveTypeModal = ref(false)
const showDeleteModal = ref(false)
const selectedLeaveType = ref(null)

const openAddModal = () => {
  selectedLeaveType.value = null
  showLeaveTypeModal.value = true
}

const openEditModal = (leaveType) => {
  selectedLeaveType.value = leaveType
  showLeaveTypeModal.value = true
}

const closeLeaveTypeModal = () => {
  showLeaveTypeModal.value = false
}

const handleSave = async (leaveType) => {
  try {
    if (leaveType.id) {
      await leaveTypeStore.updateLeaveType(leaveType.id, leaveType)
      toast.success('Leave Type updated successfully!')
    } else {
      await leaveTypeStore.createLeaveType(leaveType)
      toast.success('Leave Type added successfully!')
    }
  } catch (error) {
    toast.error('Failed to save leave type!')
    console.error('Error saving leave type:', error)
  } finally {
    closeLeaveTypeModal()
  }
}

const openDeleteModal = (leaveType) => {
  selectedLeaveType.value = leaveType
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const handleDelete = async () => {
  if (!selectedLeaveType.value || !selectedLeaveType.value.id) {
    toast.error('Invalid leave type selected for deletion!')
    return
  }
  try {
    await leaveTypeStore.deleteLeaveType(selectedLeaveType.value.id)
    toast.warning('Leave Type deleted successfully!')
  } catch (error) {
    toast.error('Failed to delete leave type!')
    console.error('Error deleting leave type:', error)
  } finally {
    closeDeleteModal()
  }
}

onMounted(async () => {
  await leaveTypeStore.fetchLeaveTypes()
})
</script>

<template>
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Leave Types" @add="openAddModal" />

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Company</th>
            <th class="py-3 px-2 text-left">Leave Name</th>
            <th class="py-3 px-2 text-left">Annual Quota</th>
            <th class="py-3 px-2 text-center">Type</th>
            <th class="py-3 px-2 text-center">Max Consecutive Days</th>
            <th class="py-3 px-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm font-light">
          <tr v-if="leaveTypeStore.loading">
            <td colspan="6">
              <LoaderView class="shadow-none" />
            </td>
          </tr>
          <template v-else-if="leaveTypeStore.leaveTypes.length">
            <tr
              v-for="leaveType in leaveTypeStore.leaveTypes"
              :key="leaveType.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ leaveType.company.name }}</p>
              </td>
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ leaveType.name }}</p>
              </td>
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ leaveType.annual_quota }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ leaveType.type }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ leaveType.max_consecutive_days || 'N/A' }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex justify-center gap-4">
                  <button
                    @click="openEditModal(leaveType)"
                    class="text-blue-600 hover:text-blue-800"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="openDeleteModal(leaveType)"
                    class="text-red-600 hover:text-red-800"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="5" class="text-center text-red-500 py-4">No leave types found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <LeaveTypeModal
      :show="showLeaveTypeModal"
      :leaveType="selectedLeaveType"
      @close="closeLeaveTypeModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Leave Type'"
      :message="`Are you sure you want to delete ${selectedLeaveType?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
