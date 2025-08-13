<script setup>
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useDeviceStore } from '@/stores/zk-device'

// ⬇️ নতুন: স্টোরস
import { useZKUserStore } from '@/stores/zk-user'
import { useZKFingerStore } from '@/stores/zk-finger'

import CheckDeviceConnection from '@/components/CheckDeviceConnection.vue'
import DeviceModal from '@/components/DeviceModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const deviceStore = useDeviceStore()
const zkUserStore = useZKUserStore()
const zkFingerStore = useZKFingerStore()
const toast = useToast()

const showDeviceModal = ref(false)
const showDeleteModal = ref(false)
const selectedDevice = ref(null)

const userCounts = ref({})

// ⬇️ নতুন: অ্যাকশন লোডিং ফ্ল্যাগ
const deviceAction = ref({ running: false, deviceId: null, label: '' })

// ⬇️ নতুন: Pull Fingerprints অপশনের জন্য মডাল স্টেট
const showPullFPModal = ref(false)
const fpDeviceId = ref(null)
const fpLimit = ref(null) // উদা: 100
const fpOffset = ref(null) // উদা: 0

// ⬇️ নতুন: "Push fingerprints to this device (single user)" modal state
const showPushFPToDeviceModal = ref(false)
const pftDeviceId = ref(null)
const pftDiff = ref(true) // মিসিং-অনলি (diff)

// ⬇️ নতুন: Catch-up কনফার্মেশন
const showCatchupConfirm = ref(false)
const catchupDeviceId = ref(null)

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

/* -------------------
 * ⬇️ নতুন: ডিভাইস-লেভেল অ্যাকশন
 * ------------------- */

// 1) Pull Users
async function handlePullUsers(device) {
  try {
    deviceAction.value = { running: true, deviceId: device.id, label: 'pull-users' }
    const res = await zkUserStore.pullUsersFromDevice(device.id)
    toast.success(
      `Pulled ${res.users_pulled} / Updated ${res.users_updated} (Device: ${device.name})`,
    )
  } catch (e) {
    toast.error(e?.message || 'Pull users failed')
  } finally {
    deviceAction.value = { running: false, deviceId: null, label: '' }
  }
}

// 2) Pull Fingerprints (open modal)
function openPullFP(device) {
  fpDeviceId.value = device.id
  fpLimit.value = null
  fpOffset.value = null
  showPullFPModal.value = true
}

function openPushFPToDevice(device) {
  pftDeviceId.value = device.id
  pftDiff.value = true
  showPushFPToDeviceModal.value = true
}

async function doPullFP() {
  if (!fpDeviceId.value) return
  try {
    deviceAction.value = { running: true, deviceId: fpDeviceId.value, label: 'pull-fp' }
    const res = await zkFingerStore.pullFingerprintsFromDevice(fpDeviceId.value, {
      limit: fpLimit.value ?? null,
      offset: fpOffset.value ?? null,
    })
    toast.success(`Fingerprints pulled: ${res.fingerprints_pulled}`)
  } catch (e) {
    toast.error(e?.message || 'Pull fingerprints failed')
  } finally {
    deviceAction.value = { running: false, deviceId: null, label: '' }
    showPullFPModal.value = false
  }
}

async function doPushFPToDevice() {
  if (!pftDeviceId.value) {
    toast.warning('Device এবং ZK User ID দিন')
    return
  }
  try {
    deviceAction.value = { running: true, deviceId: pftDeviceId.value, label: 'push-fp-to-device' }
    const res = await zkFingerStore.pushFingerprintsToDevice(pftDeviceId.value, {
      diff: pftDiff.value,
    })
    // রেসপন্স যাই আসুক—সাকসেস টোস্ট
    toast.success('User fingerprints pushed to device successfully')
  } catch (e) {
    toast.error(e?.message || 'Push to device failed')
  } finally {
    deviceAction.value = { running: false, deviceId: null, label: '' }
    showPushFPToDeviceModal.value = false
  }
}

// 3) Sync Catch-up (confirm + run)
function openCatchupConfirmModal(device) {
  catchupDeviceId.value = device.id
  showCatchupConfirm.value = true
}
async function doCatchup() {
  if (!catchupDeviceId.value) return
  try {
    deviceAction.value = { running: true, deviceId: catchupDeviceId.value, label: 'catchup' }
    const res = await zkUserStore.syncCatchupUsers(catchupDeviceId.value, { diff: true })
    toast.success(`Synced: ${res.usersSynced}, Skipped: ${res.skipped}, Failed: ${res.failed}`)
  } catch (e) {
    toast.error(e?.message || 'Catch-up failed')
  } finally {
    deviceAction.value = { running: false, deviceId: null, label: '' }
    showCatchupConfirm.value = false
  }
}

// কার্ডে কাজ চলছে কিনা চেক
const rowBusy = (device, label = null) =>
  deviceAction.value.running &&
  deviceAction.value.deviceId === device.id &&
  (label ? deviceAction.value.label === label : true)

async function handleUserCount(device) {
  try {
    deviceAction.value = { running: true, deviceId: device.id, label: 'user-count' }
    const res = await zkUserStore.getDeviceUserCount(device.id)
    if (!res.online) {
      toast.warning(`Device ${device.name} is offline`)
    }
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

    <!-- পেজ-লেভেল লোডার -->
    <LoaderView v-if="deviceStore.loading" />

    <!-- Cards View -->
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
          <!-- কার্ড ওভারলে স্পিনার -->
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
            <!-- Pull Users -->
            <button
              class="text-indigo-600 hover:text-indigo-800"
              :disabled="rowBusy(device)"
              @click="handlePullUsers(device)"
              title="Pull Users"
            >
              <i v-if="!rowBusy(device, 'pull-users')" class="fas fa-users"></i>
              <i v-else class="fas fa-circle-notch fa-spin"></i>
            </button>

            <!-- Pull Fingerprints -->
            <button
              class="text-teal-600 hover:text-teal-800"
              :disabled="rowBusy(device)"
              @click="openPullFP(device)"
              title="Pull Fingerprints"
            >
              <i v-if="!rowBusy(device, 'pull-fp')" class="fas fa-fingerprint"></i>
              <i v-else class="fas fa-circle-notch fa-spin"></i>
            </button>

            <!-- Push ALL fingerprints → this device -->
            <button
              class="text-purple-600 hover:text-purple-800"
              :disabled="rowBusy(device)"
              @click="openPushFPToDevice(device)"
              title="Push ALL fingerprints → this device"
            >
              <i v-if="!rowBusy(device, 'push-fp-to-device')" class="fas fa-cloud-upload-alt"></i>
              <i v-else class="fas fa-circle-notch fa-spin"></i>
            </button>

            <!-- Sync Catch-up (diff) -->
            <button
              class="text-amber-600 hover:text-amber-800"
              :disabled="rowBusy(device)"
              @click="openCatchupConfirmModal(device)"
              title="Sync Catch-up (diff)"
            >
              <i v-if="!rowBusy(device, 'catchup')" class="fas fa-sync-alt"></i>
              <i v-else class="fas fa-circle-notch fa-spin"></i>
            </button>

            <button
              class="text-slate-700 hover:text-slate-900"
              :disabled="rowBusy(device)"
              @click="handleUserCount(device)"
              title="User Count"
            >
              <i v-if="!rowBusy(device, 'user-count')" class="fas fa-list-ol"></i>
              <i v-else class="fas fa-circle-notch fa-spin"></i>
            </button>

            <!-- Edit (ডানদিকে ঠেলে দিচ্ছি) -->
            <button
              class="text-blue-600 hover:text-blue-800 ml-auto"
              @click="openEditModal(device)"
              title="Edit"
            >
              <i class="fas fa-edit"></i>
            </button>
          </div>

          <!-- ছোট স্টেট ট্যাগ + User Count badge -->
          <div class="mt-2 text-[11px] text-gray-500">
            <span v-if="rowBusy(device)">Working: {{ deviceAction.label }}</span>

            <!-- User count badge -->
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

    <!-- বিদ্যমান মডাল -->
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

    <!-- Pull Fingerprints options modal (ওভারলে স্পিনার চাইলে relative + overlay যোগ করো) -->
    <div v-if="showPullFPModal" class="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div class="bg-white rounded-lg w-full max-w-md p-5 shadow relative">
        <div
          v-if="deviceAction.running"
          class="absolute inset-0 bg-white/60 grid place-items-center rounded-lg"
        >
          <i class="fas fa-circle-notch fa-spin text-2xl"></i>
        </div>

        <h3 class="text-lg font-semibold mb-3">Pull Fingerprints (Options)</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm mb-1">Device</label>
            <select v-model="fpDeviceId" class="w-full border rounded p-2">
              <option disabled value="">-- Select device --</option>
              <option v-for="d in deviceStore.devices" :key="d.id" :value="d.id">
                {{ d.name }} ({{ d.ip_address }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm mb-1">Limit (optional)</label>
              <input
                type="number"
                v-model.number="fpLimit"
                min="1"
                class="w-full border rounded p-2"
                placeholder="e.g. 100"
              />
            </div>
            <div>
              <label class="block text-sm mb-1">Offset (optional)</label>
              <input
                type="number"
                v-model.number="fpOffset"
                min="0"
                class="w-full border rounded p-2"
                placeholder="e.g. 0"
              />
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            @click="showPullFPModal = false"
            class="px-3 py-2 border rounded"
            :disabled="deviceAction.running"
          >
            Cancel
          </button>
          <button
            @click="doPullFP"
            class="px-3 py-2 bg-teal-600 text-white rounded"
            :disabled="deviceAction.running"
          >
            <i v-if="deviceAction.running" class="fas fa-circle-notch fa-spin mr-1"></i>
            <span>{{ deviceAction.running ? 'Working...' : 'Pull' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Push fingerprints to this device -->
    <div
      v-if="showPushFPToDeviceModal"
      class="fixed inset-0 bg-black/40 grid place-items-center z-50"
    >
      <div class="bg-white rounded-lg w-full max-w-md p-5 shadow relative">
        <div
          v-if="deviceAction.running"
          class="absolute inset-0 bg-white/60 grid place-items-center rounded-lg"
        >
          <i class="fas fa-circle-notch fa-spin text-2xl"></i>
        </div>

        <h3 class="text-lg font-semibold mb-3">Push ALL fingerprints → this device</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm mb-1">Device</label>
            <select v-model="pftDeviceId" class="w-full border rounded p-2">
              <option disabled value="">-- Select device --</option>
              <option v-for="d in deviceStore.devices" :key="d.id" :value="d.id">
                {{ d.name }} ({{ d.ip_address }})
              </option>
            </select>
          </div>

          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="pftDiff" />
            <span>Send missing only (diff)</span>
          </label>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            @click="showPushFPToDeviceModal = false"
            class="px-3 py-2 border rounded"
            :disabled="deviceAction.running"
          >
            Cancel
          </button>
          <button
            @click="doPushFPToDevice"
            class="px-3 py-2 bg-purple-600 text-white rounded"
            :disabled="deviceAction.running"
          >
            <i v-if="deviceAction.running" class="fas fa-circle-notch fa-spin mr-1"></i>
            <span>{{ deviceAction.running ? 'Working...' : 'Push' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Catch-up confirm -->
    <DeleteModal
      :show="showCatchupConfirm"
      title="Sync Catch-up"
      message="এই ডিভাইসে যেগুলো নেই, শুধু সেগুলো পুশ করা হবে (user-only, diff). Proceed?"
      @close="showCatchupConfirm = false"
      @confirm="doCatchup"
    />
  </div>
</template>
