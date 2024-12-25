<script setup>
import { ref, onMounted } from 'vue'
import { useShiftStore } from '@/stores/shift'
import { useToast } from 'vue-toastification'

import ShiftModal from '@/components/ShiftModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'

const shiftStore = useShiftStore()
const toast = useToast()

const shifts = shiftStore.shifts
const isLoading = shiftStore.loading

const showShiftModal = ref(false)
const showDeleteModal = ref(false)
const selectedShift = ref(null)

const openAddModal = () => {
  selectedShift.value = null
  showShiftModal.value = true
}

const closeShiftModal = () => {
  showShiftModal.value = false
}

const openEditModal = (shift) => {
  selectedShift.value = shift
  showShiftModal.value = true
}

const openDeleteModal = (shift) => {
  selectedShift.value = shift
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const handleSave = async (shift) => {
  try {
    if (shift.id) {
      await shiftStore.updateShift(shift.id, shift)
      toast.success('Shift updated successfully!')
    } else {
      await shiftStore.createShift(shift)
      toast.success('Shift added successfully!')
    }
  } catch (error) {
    toast.error('Failed to save shift!')
    console.error('Error handling save:', error)
  } finally {
    await fetchShifts()
    closeShiftModal()
  }
}

const handleDelete = async () => {
  if (!selectedShift.value || !selectedShift.value.id) {
    toast.error('Invalid shift selected for deletion!')
    return
  }
  try {
    await shiftStore.deleteShift(selectedShift.value.id)
    toast.success('Shift deleted successfully!')
  } catch (error) {
    toast.error('Failed to delete shift!')
    console.error('Error deleting shift:', error)
  } finally {
    await fetchShifts()
    closeDeleteModal()
  }
}

const fetchShifts = async () => {
  try {
    await shiftStore.fetchShifts()
  } catch (error) {
    toast.error('Failed to fetch shifts!')
    console.error('Error fetching shifts:', error)
  }
}

onMounted(async () => {
  await fetchShifts()
})
</script>

<template>
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Shift List" @add="openAddModal" />

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">Start Time</th>
            <th class="py-3 px-2 text-left">End Time</th>
            <th class="py-3 px-2 text-center">Company</th>
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
          <template v-else-if="shifts && shifts.length">
            <tr
              v-for="shift in shifts"
              :key="shift.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ shift.name }}</p>
              </td>
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ shift.start_time }}</p>
              </td>
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ shift.end_time }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ shift?.company?.name }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ shift.status }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex item-center justify-center gap-4">
                  <button
                    @click="openEditModal(shift)"
                    class="text-blue-600 hover:text-blue-800"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="openDeleteModal(shift)"
                    class="text-red-600 hover:text-red-800"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="6" class="text-center text-red-500 py-4">No shifts found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ShiftModal
      :show="showShiftModal"
      :shift="selectedShift"
      @close="closeShiftModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Shift'"
      :message="`Are you sure you want to delete ${selectedShift?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
