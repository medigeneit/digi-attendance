<script setup>
import { ref, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/device'

import AddDevice from '@/components/device/AddDevice.vue'
import EditDevice from '@/components/device/EditDevice.vue'
import DeleteDevice from '@/components/device/DeleteDevice.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const deviceStore = useDeviceStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedDevice = ref(null)
const isLoading = ref(true)

const openAddModal = () => (showAddModal.value = true)
const closeAddModal = async () => {
  showAddModal.value = false
  await deviceStore.fetchDevices()
}

const openEditModal = (device) => {
  selectedDevice.value = device
  showEditModal.value = true
}
const closeEditModal = async () => {
  showEditModal.value = false
  await deviceStore.fetchDevices()
}

const openDeleteModal = (device) => {
  selectedDevice.value = device
  showDeleteModal.value = true
}
const closeDeleteModal = () => (showDeleteModal.value = false)

onMounted(async () => {
  try {
    await deviceStore.fetchDevices()
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="my-container space-y-2">
    <div class="flex justify-between items-center">
      <h1 class="title-lg">Device List</h1>
      <button class="btn-2" @click="openAddModal">Add New</button>
    </div>
    <LoaderView v-if="isLoading" />

    <div v-else class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">IP Address</th>
            <th class="py-3 px-2 text-center">Port</th>
            <th class="py-3 px-2 text-center">Status</th>
            <th class="py-3 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm font-light">
          <template v-if="deviceStore.devices.length">
            <tr
              v-for="device in deviceStore.devices"
              :key="device.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ device.name }}</p>
              </td>
              <td class="py-3 px-2 text-left whitespace-nowrap">
                <p class="font-medium">{{ device.ip_address }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ device.port }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ device.status }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex item-center justify-center gap-4">
                  <button @click="openEditModal(device)" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click="openDeleteModal(device)" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="5" class="text-center text-red-500 py-4">No devices found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <AddDevice v-if="showAddModal" @close="closeAddModal" />
  <EditDevice v-if="showEditModal" :device="selectedDevice" @close="closeEditModal" />
  <DeleteDevice v-if="showDeleteModal" :device="selectedDevice" @close="closeDeleteModal" />
</template>
