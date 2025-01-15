<script setup>
import { onMounted, ref } from 'vue'
import { useHolidayStore } from '@/stores/holiday'
import { useToast } from 'vue-toastification'

import HolidayModal from '@/components/HolidayModal.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'

const holidayStore = useHolidayStore()
const toast = useToast()

const showHolidayModal = ref(false)
const showDeleteModal = ref(false)
const selectedHoliday = ref(null)

const openAddModal = () => {
  selectedHoliday.value = null
  showHolidayModal.value = true
}

const openEditModal = (holiday) => {
  selectedHoliday.value = holiday
  showHolidayModal.value = true
}

const closeHolidayModal = () => {
  showHolidayModal.value = false
}

const handleSave = async (holiday) => {
  try {
    if (holiday.id) {
      await holidayStore.updateHoliday(holiday.id, holiday)
      toast.success('Holiday updated successfully!')
    } else {
      await holidayStore.createHoliday(holiday)
      toast.success('Holiday added successfully!')
    }
    await holidayStore.fetchHolidays()
  } catch (error) {
    toast.error('Failed to save holiday!')
    console.error('Error handling save:', error)
  }
}

const openDeleteModal = (holiday) => {
  selectedHoliday.value = holiday
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const handleDelete = async () => {
  if (!selectedHoliday.value || !selectedHoliday.value.id) {
    toast.error('Invalid holiday selected for deletion!')
    return
  }
  try {
    await holidayStore.deleteHoliday(selectedHoliday.value.id)
    toast.warning('Holiday deleted successfully!')
    await holidayStore.fetchHolidays()
  } catch (error) {
    toast.error('Failed to delete holiday!')
    console.error('Error deleting holiday:', error)
  } finally {
    closeDeleteModal()
  }
}

onMounted(async () => {
  await holidayStore.fetchHolidays()
})
</script>

<template>
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Holiday List" @add="openAddModal" />

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">Company</th>
            <th class="py-3 px-2 text-center">Start Date</th>
            <th class="py-3 px-2 text-center">End Date</th>
            <th class="py-3 px-2 text-center">Type</th>
            <th class="py-3 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm">
          <tr v-if="holidayStore.loading">
            <td colspan="5">
              <LoaderView />
            </td>
          </tr>
          <template v-else-if="holidayStore.holidays && holidayStore.holidays.length">
            <tr
              v-for="holiday in holidayStore.holidays"
              :key="holiday.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ holiday.name }}</p>
              </td>
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ holiday?.company?.name || 'All' }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ holiday.start_date }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ holiday.end_date }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ holiday.type }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex item-center justify-center gap-4">
                  <button @click="openEditModal(holiday)" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click="openDeleteModal(holiday)" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="5" class="text-center text-red-500 py-4">No holidays found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <HolidayModal
      :show="showHolidayModal"
      :holiday="selectedHoliday"
      @close="closeHolidayModal"
      @save="handleSave"
    />
    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Holiday'"
      :message="`Are you sure you want to delete ${selectedHoliday?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
