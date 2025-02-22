<script setup>
import { useDeviceStore } from '@/stores/device'
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

import CheckDeviceConnection from '@/components/CheckDeviceConnection.vue'
import DeviceModal from '@/components/DeviceModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const deviceStore = useDeviceStore()
const toast = useToast()

const showDeviceModal = ref(false)
const showDeleteModal = ref(false)
const selectedDevice = ref(null)

const openAddModal = () => {
  selectedDevice.value = null
  showDeviceModal.value = true
}

const openEditModal = (device) => {
  selectedDevice.value = device
  showDeviceModal.value = true
}

const closeDeviceModal = () => {
  showDeviceModal.value = false
}

const handleSave = async (device) => {
  try {
    if (device.id) {
      await deviceStore.updateDevice(device.id, device)
      toast.success('Device updated successfully!')
    } else {
      await deviceStore.createDevice(device)
      toast.success('Device added successfully!')
    }
    await deviceStore.fetchDevices()
  } catch (error) {
    toast.error('Failed to save device!')
    console.error('Error handling save:', error)
  }
}

const openDeleteModal = (device) => {
  selectedDevice.value = device
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const handleDelete = async () => {
  if (!selectedDevice.value || !selectedDevice.value.id) {
    toast.error('Invalid device selected for deletion!')
    return
  }
  try {
    await deviceStore.deleteDevice(selectedDevice.value.id)
    toast.warning('Device deleted successfully!')
    await deviceStore.fetchDevices()
  } catch (error) {
    toast.error('Failed to delete device!')
    console.error('Error deleting device:', error)
  } finally {
    closeDeleteModal()
  }
}

onMounted(async () => {
  await deviceStore.fetchDevices()
})
</script>

<template>
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Device List" @add="openAddModal" />

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">IP Address</th>
            <th class="py-3 px-2 text-center">Port</th>
            <th class="py-3 px-2 text-center">Status</th>
            <th class="py-3 px-2 text-center">Connection</th>
            <th class="py-3 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm">
          <tr v-if="deviceStore.loading">
            <td colspan="6">
              <LoaderView />
            </td>
          </tr>
          <template v-else-if="deviceStore.devices && deviceStore.devices.length">
            <tr
              v-for="device in deviceStore.devices"
              :key="device.id"
              class="border-b border-gray-200 hover:bg-blue-200"
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
                <CheckDeviceConnection :device="device" />
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex item-center justify-center gap-4">
                  <button @click="openEditModal(device)" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    v-if="false"
                    @click="openDeleteModal(device)"
                    class="text-red-600 hover:text-red-800"
                  >
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

    <DeviceModal
      :show="showDeviceModal"
      :device="selectedDevice"
      @close="closeDeviceModal"
      @save="handleSave"
    />
    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Device'"
      :message="`Are you sure you want to delete ${selectedDevice?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
