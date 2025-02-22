<script setup>
import LeaveApprovalModal from '@/components/LeaveApprovalModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useLeaveApprovalStore } from '@/stores/leave-approval'
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

const leaveApprovalStore = useLeaveApprovalStore()
const toast = useToast()

const showLeaveApprovalModal = ref(false)
const showDeleteModal = ref(false)
const selectedLeaveApproval = ref(null)

const openAddModal = () => {
  selectedLeaveApproval.value = null
  showLeaveApprovalModal.value = true
}

const openEditModal = (leaveApproval) => {
  selectedLeaveApproval.value = { ...leaveApproval } // Ensure we don't modify the original object
  showLeaveApprovalModal.value = true
}

const closeLeaveApprovalModal = () => {
  showLeaveApprovalModal.value = false
}

const openDeleteModal = (leaveApproval) => {
  selectedLeaveApproval.value = leaveApproval
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const handleDelete = async () => {
  if (!selectedLeaveApproval.value?.id) {
    toast.error('Invalid leave approval selected for deletion!')
    return
  }

  try {
    await leaveApprovalStore.deleteLeaveApproval(selectedLeaveApproval.value.id)
    toast.success('Leave approval deleted successfully!')
  } catch (error) {
    toast.error('Failed to delete leave approval!')
    console.error('Error deleting leave approval:', error)
  } finally {
    closeDeleteModal()
  }
}

const handleSave = async (leaveApproval) => {
  const action = leaveApproval.id ? 'updateLeaveApproval' : 'createLeaveApproval'
  const successMessage = leaveApproval.id
    ? 'Leave approval updated successfully!'
    : 'Leave approval added successfully!'

  try {
    await leaveApprovalStore[action](leaveApproval.id || leaveApproval, leaveApproval)
    toast.success(successMessage)
  } catch (error) {
    toast.error('Failed to save leave approval!')
    console.error('Error saving leave approval:', error)
  } finally {
    closeLeaveApprovalModal()
  }
}

onMounted(() => {
  leaveApprovalStore.fetchLeaveApprovals()
})
</script>

<template>
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Leave Approvals" @add="openAddModal" />

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">#</th>
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">In-Charge</th>
            <th class="py-3 px-2 text-left">Coordinator</th>
            <th class="py-3 px-2 text-left">Operational Admin</th>
            <th class="py-3 px-2 text-left">Recommend By</th>
            <th class="py-3 px-2 text-left">Approved By</th>
            <th class="py-3 px-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm">
          <tr v-if="leaveApprovalStore.loading">
            <td colspan="8">
              <LoaderView class="shadow-none" />
            </td>
          </tr>
          <template v-else-if="leaveApprovalStore.leaveApprovals.length">
            <tr
              v-for="leaveApproval in leaveApprovalStore.leaveApprovals"
              :key="leaveApproval.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="py-3 px-2 text-left">{{ leaveApproval.id }}</td>
              <td class="py-3 px-2 text-left">{{ leaveApproval.name }}</td>
              <td class="py-3 px-2 text-left">{{ leaveApproval.in_charge_user?.name || 'N/A' }}</td>
              <td class="py-3 px-2 text-left">
                {{ leaveApproval.coordinator_user?.name || 'N/A' }}
              </td>
              <td class="py-3 px-2 text-left">
                {{ leaveApproval.operational_admin_user?.name || 'N/A' }}
              </td>
              <td class="py-3 px-2 text-left">
                {{ leaveApproval.recommend_by_user?.name || 'N/A' }}
              </td>
              <td class="py-3 px-2 text-left">
                {{ leaveApproval.approved_by_user?.name || 'N/A' }}
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex justify-center gap-4">
                  <button
                    @click="openEditModal(leaveApproval)"
                    class="text-blue-600 hover:text-blue-800"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="openDeleteModal(leaveApproval)"
                    class="text-red-600 hover:text-red-800"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="8" class="text-center text-red-500 py-4">No leave approvals found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <LeaveApprovalModal
      :show="showLeaveApprovalModal"
      :leaveApproval="selectedLeaveApproval"
      @close="closeLeaveApprovalModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Leave Approval'"
      :message="`Are you sure you want to delete ${selectedLeaveApproval?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
