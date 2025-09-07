<script setup>
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useDeviceStore } from '@/stores/zk-device.js'
import DeviceCard from '@/components/DeviceCard.vue'

// (optional) তোমার আগের Modal/Components থাকলে import করে ব্যবহার করতে পারো
import DeviceModal from '@/components/DeviceModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const store = useDeviceStore()
const toast = useToast()

const showDeviceModal = ref(false)
const selectedDevice = ref(null)
const showConfirmModal = ref(false)
const deviceToDelete = ref(null)

onMounted(async () => {
  await store.fetchDevices()
})

function openAddModal() {
  selectedDevice.value = null
  showDeviceModal.value = true
}
function openEditModal(d) {
  selectedDevice.value = d
  showDeviceModal.value = true
}
function closeDeviceModal() {
  showDeviceModal.value = false
}

async function handleSave(payload) {
  try {
    if (payload.id) {
      await store.updateDevice(payload.id, payload)
      toast.success('Device updated')
    } else {
      await store.createDevice(payload)
      toast.success('Device added')
    }
    await store.fetchDevices()
  } catch (e) {
    toast.error(e?.message || 'Save failed')
  } finally {
    closeDeviceModal()
  }
}

function askDelete(d) {
  deviceToDelete.value = d
  showConfirmModal.value = true
}
async function confirmDelete() {
  if (!deviceToDelete.value) return
  try {
    await store.deleteDevice(deviceToDelete.value.id)
    toast.warning('Device deleted')
    await store.fetchDevices()
  } catch (e) {
    toast.error(e?.message || 'Delete failed')
  } finally {
    showConfirmModal.value = false
    deviceToDelete.value = null
  }
}
</script>

<template>
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Device List" @add="openAddModal" />

    <LoaderView v-if="store.loading" />
    <div v-else>
      <div v-if="store.devices?.length" class="grid gap-4 md:grid-cols-2">
        <DeviceCard
          v-for="d in store.devices"
          :key="d.id"
          :device="d"
          @edit="openEditModal"
          @delete="askDelete"
          @refresh="store.fetchDevices()"
        />
      </div>
      <div v-else class="text-center text-red-500 py-8">No devices found</div>
    </div>
  </div>

  <!-- Device add/edit modal -->
  <DeviceModal
    :show="showDeviceModal"
    :device="selectedDevice"
    @close="closeDeviceModal"
    @save="handleSave"
  />

  <!-- Confirm delete -->
  <DeleteModal
    :show="showConfirmModal"
    :title="confirmTitle"
    :message="confirmMessage"
    @close="closeConfirmModal"
    @confirm="handleConfirm"
  />
</template>
