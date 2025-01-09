<script setup>
import { ref, onMounted, computed } from 'vue'
import { useShiftStore } from '@/stores/shift'
import { useToast } from 'vue-toastification'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import ShiftModal from '@/components/ShiftModal.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const shiftStore = useShiftStore()
const toast = useToast()

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
    closeDeleteModal()
  }
}

const groupedShifts = computed(() => {
  const grouped = {}
  shiftStore.shifts.forEach((shift) => {
    const companyName = shift?.company?.name || 'Unknown Company'
    if (!grouped[companyName]) {
      grouped[companyName] = []
    }
    grouped[companyName].push(shift)
  })
  return grouped
})

onMounted(async () => {
  try {
    await shiftStore.fetchShifts()
  } catch (error) {
    toast.error('Failed to fetch shifts!')
    console.error('Error fetching shifts:', error)
  }
})
</script>
<template>
  <div class="my-container space-y-4">
    <HeaderWithButtons title="Shift List" @add="openAddModal" />

    <div v-if="shiftStore.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-for="(shifts, companyName) in groupedShifts" :key="companyName">
        <h2 class="title-md">{{ companyName }}</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
                <th class="py-3 px-2 text-left">Name</th>
                <th class="py-3 px-2 text-left">Start Time</th>
                <th class="py-3 px-2 text-left">End Time</th>
                <th class="py-3 px-2 text-center">Status</th>
                <th class="py-3 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="text-gray-600 text-sm">
              <tr
                v-for="shift in shifts"
                :key="shift.id"
                class="border-b border-gray-200 hover:bg-gray-100"
              >
                <td class="py-3 px-2 text-left">{{ shift.name }}</td>
                <td class="py-3 px-2 text-left">{{ shift.start_time }}</td>
                <td class="py-3 px-2 text-left">{{ shift.end_time }}</td>
                <td class="py-3 px-2 text-center">{{ shift.status }}</td>
                <td class="py-3 px-2 text-center">
                  <div class="flex item-center justify-center gap-4">
                    <button @click="openEditModal(shift)" class="text-blue-600 hover:text-blue-800">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button @click="openDeleteModal(shift)" class="text-red-600 hover:text-red-800">
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
