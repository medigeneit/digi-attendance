<script setup>
import { onMounted, ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useDeviceStore } from '@/stores/zk-device'
import { useZKUserStore } from '@/stores/zk-user'
import { useZKFingerStore } from '@/stores/zk-finger' // ✅ new

import CheckDeviceConnection from '@/components/CheckDeviceConnection.vue'
import DeviceModal from '@/components/DeviceModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const deviceStore = useDeviceStore()
const zkUserStore = useZKUserStore()
const zkFingerStore = useZKFingerStore() // ✅ new
const toast = useToast()

const showDeviceModal = ref(false)
const selectedDevice = ref(null)

// 🔁 একটাই DeleteModal চার কাজে: delete / pull (users) / push (users) / pull-fp (fingers)
const showConfirmModal = ref(false)
const confirmAction = ref(null) // 'delete' | 'pull' | 'push' | 'pull-fp'

const userCounts = ref({})
const deviceAction = ref({ running: false, deviceId: null, label: '' })

const openAddModal = () => {
  selectedDevice.value = null
  showDeviceModal.value = true
}
const openEditModal = (device) => {
  selectedDevice.value = device
  showDeviceModal.value = true
}
const closeDeviceModal = () => (showDeviceModal.value = false)

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

// 🔘 কনফার্ম-ওপেনারগুলো
const openDeleteModal = (device) => {
  selectedDevice.value = device
  confirmAction.value = 'delete'
  showConfirmModal.value = true
}
const openPullModal = (device) => {
  selectedDevice.value = device
  confirmAction.value = 'pull'
  showConfirmModal.value = true
}
const openPushModal = (device) => {
  selectedDevice.value = device
  confirmAction.value = 'push'
  showConfirmModal.value = true
}
const openPullFingerModal = (device) => {
  // ✅ new
  selectedDevice.value = device
  confirmAction.value = 'pull-fp'
  showConfirmModal.value = true
}

const closeConfirmModal = () => (showConfirmModal.value = false)

const confirmTitle = computed(() => {
  if (confirmAction.value === 'pull') return 'Pull Users from Device'
  if (confirmAction.value === 'push') return 'Push All Users to Device'
  if (confirmAction.value === 'pull-fp') return 'Pull Fingerprints from Device' // ✅ new
  return 'Delete Device'
})

const confirmMessage = computed(() => {
  const name = selectedDevice.value?.name || 'this device'
  if (confirmAction.value === 'pull') {
    return `Pull all users from "${name}"? Only new users will be saved centrally.`
  }
  if (confirmAction.value === 'push') {
    return `Push all central users to "${name}"? Only users missing on the device will be created.`
  }
  if (confirmAction.value === 'pull-fp') {
    // ✅ new
    return `Pull all fingerprints from "${name}"? Only new prints will be saved centrally.`
  }
  return `Are you sure you want to delete "${name}"?`
})

// 🔁 কার্ড ওভারলে/বিজি চেক
const rowBusy = (device, label = null) =>
  deviceAction.value.running &&
  deviceAction.value.deviceId === device.id &&
  (label ? deviceAction.value.label === label : true)

onMounted(async () => {
  await deviceStore.fetchDevices()
})

// ✅ কনফার্ম হ্যান্ডলার
const handleConfirm = async () => {
  if (!selectedDevice.value?.id) {
    toast.error('No device selected!')
    return
  }
  const device = selectedDevice.value
  try {
    if (confirmAction.value === 'delete') {
      deviceAction.value = { running: true, deviceId: device.id, label: 'delete-device' }
      await deviceStore.deleteDevice(device.id)
      toast.warning('Device deleted successfully!')
      await deviceStore.fetchDevices()
    } else if (confirmAction.value === 'pull') {
      deviceAction.value = { running: true, deviceId: device.id, label: 'pull-users' }
      const res = await zkUserStore.pullUsersFromDevice(device.id)
      toast.success(
        `Pulled users from ${device.name}: seen ${res.seen}, inserted ${res.inserted}, mapped ${res.mapped}`,
      )
    } else if (confirmAction.value === 'push') {
      deviceAction.value = { running: true, deviceId: device.id, label: 'push-users' }
      const res = await zkUserStore.pushAllUsersToDevice(device.id)
      toast.success(`Pushed to ${device.name}: new ${res.pushed}, already ${res.already}`)
    } else if (confirmAction.value === 'pull-fp') {
      // ✅ new
      deviceAction.value = { running: true, deviceId: device.id, label: 'pull-fp' }
      const res = await zkFingerStore.pullFingerprintsFromDevice(device.id)
      toast.success(
        `Pulled fingerprints from ${device.name}: seen ${res.seen}, inserted ${res.inserted}, skipped ${res.skipped}, unmatched ${res.unmatched}`,
      )
    }
  } catch (error) {
    const msg = error?.message || error?.error || 'Operation failed'
    toast.error(msg)
    console.error('Confirm action error:', error)
  } finally {
    deviceAction.value = { running: false, deviceId: null, label: '' }
    closeConfirmModal()
  }
}

async function handleUserCount(device) {
  try {
    deviceAction.value = { running: true, deviceId: device.id, label: 'user-count' }
    const res = await zkUserStore.getDeviceUserCount(device.id)
    if (!res.online) toast.warning(`Device ${device.name} is offline`)
    userCounts.value[device.id] = {
      count: Number(res.user_count ?? 0),
      online: !!res.online,
      at: new Date().toISOString(),
    }
  } catch (e) {
    toast.error(e?.message || 'User count failed')
  } finally {
    deviceAction.value = { running: false, deviceId: null, label: '' }
  }
}
</script>

<template>
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Device List" @add="openAddModal" />

    <LoaderView v-if="deviceStore.loading" />

    <div v-else>
      <div
        v-if="deviceStore.devices && deviceStore.devices.length"
        class="grid gap-4 md:grid-cols-3"
      >
        <div
          v-for="device in deviceStore.devices"
          :key="device.id"
          class="relative rounded-xl border p-4 shadow bg-white hover:shadow-md transition"
        >
          <!-- ওভারলে স্পিনার -->
          <div
            v-if="rowBusy(device)"
            class="absolute inset-0 bg-white/60 grid place-items-center rounded-xl z-10"
          >
            <i class="fas fa-circle-notch fa-spin text-2xl"></i>
          </div>

          <!-- হেডার -->
          <div class="flex items-start justify-between">
            <div>
              <div class="text-base font-semibold">{{ device.name }}</div>
              <div class="text-xs text-gray-500">{{ device.ip_address }} : {{ device.port }}</div>
            </div>
            <span
              class="text-xs px-2 py-0.5 rounded"
              :class="
                device.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : device.status === 'inactive'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-red-100 text-red-700'
              "
            >
              {{ device.status }}
            </span>
          </div>

          <!-- কানেকশন -->
          <div class="mt-2">
            <CheckDeviceConnection :device="device" />
          </div>

          <!-- অ্যাকশন বাটনস -->
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <!-- User count -->
            <button
              class="text-slate-700 hover:text-slate-900"
              :disabled="rowBusy(device)"
              @click="handleUserCount(device)"
              title="User Count"
            >
              <i v-if="!rowBusy(device, 'user-count')" class="fas fa-list-ol"></i>
              <i v-else class="fas fa-circle-notch fa-spin"></i>
            </button>

            <!-- Pull users (device -> central) -->
            <button
              class="text-amber-600 hover:text-amber-800"
              :disabled="rowBusy(device)"
              @click="openPullModal(device)"
              title="Pull Users from Device"
            >
              <i class="fas fa-download"></i>
            </button>

            <!-- Push all users (central -> device) -->
            <button
              class="text-emerald-600 hover:text-emerald-800"
              :disabled="rowBusy(device)"
              @click="openPushModal(device)"
              title="Push Users to Device"
            >
              <i class="fas fa-upload"></i>
            </button>

            <!-- Pull fingerprints (device -> central) ✅ new -->
            <button
              class="text-purple-600 hover:text-purple-800"
              :disabled="rowBusy(device)"
              @click="openPullFingerModal(device)"
              title="Pull Fingerprints from Device"
            >
              <i v-if="!rowBusy(device, 'pull-fp')" class="fas fa-fingerprint"></i>
              <i v-else class="fas fa-circle-notch fa-spin"></i>
            </button>

            <!-- Edit (ডানদিকে) -->
            <button
              class="text-blue-600 hover:text-blue-800 ml-auto"
              @click="openEditModal(device)"
              title="Edit"
            >
              <i class="fas fa-edit"></i>
            </button>

            <!-- Delete -->
            <button
              class="text-red-600 hover:text-red-800"
              :disabled="rowBusy(device)"
              @click="openDeleteModal(device)"
              title="Delete"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>

          <!-- ছোট স্টেট + User Count badge -->
          <div class="mt-2 text-[11px] text-gray-500">
            <span v-if="rowBusy(device)">Working: {{ deviceAction.label }}</span>

            <span
              v-if="userCounts[device.id]"
              class="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700"
              title="Last checked at"
            >
              <i class="fas fa-user"></i>
              <span>Users: {{ userCounts[device.id].count }}</span>
              <span v-if="!userCounts[device.id].online" class="text-red-600">(offline)</span>
            </span>
          </div>
        </div>
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

  <!-- একটাই কনফার্ম মোডাল: delete / pull / push / pull-fp -->
  <DeleteModal
    :show="showConfirmModal"
    :title="confirmTitle"
    :message="confirmMessage"
    @close="closeConfirmModal"
    @confirm="handleConfirm"
  />
</template>
