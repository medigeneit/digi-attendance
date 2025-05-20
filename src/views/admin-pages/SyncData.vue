<script setup>
import { ref, onMounted } from 'vue'
import { useSyncStore } from '@/stores/sync'
import { useDeviceStore } from '@/stores/device'

const syncStore = useSyncStore()
const deviceStore = useDeviceStore()

const selectedDevice = ref('')

onMounted(() => {
  deviceStore.fetchDevices()
})

const handlePullUsers = () => {
  if (selectedDevice.value) {
    syncStore.pullUsers(selectedDevice.value)
  }
}
const handlePushUsers = () => {
  if (selectedDevice.value) {
    syncStore.pushUsers(selectedDevice.value)
  }
}
const handlePullFps = () => {
  if (selectedDevice.value) {
    syncStore.pullFingerprints(selectedDevice.value)
  }
}
const handlePushFps = () => {
  if (selectedDevice.value) {
    syncStore.pushFingerprints(selectedDevice.value)
  }
}

const userForm = ref({
  zk_uid: '',
  zk_userid: '',
  name: '',
  password: '',
  role: 0,
  cardno: '',
})

const handleCreateUser = async () => {
  if (!selectedDevice.value) return

  await syncStore.createUser(selectedDevice.value, userForm.value)

  // Reset form after success
  if (!syncStore.error.value) {
    userForm.value = {
      zk_uid: '',
      zk_userid: '',
      name: '',
      password: '',
      role: 0,
      cardno: '',
    }
  }
}
</script>

<template>
  <div class="my-container space-y-4">
    <h1 class="title-lg">🔄 Data Sync</h1>

    <div class="card-bg p-4 md:p-6 space-y-4">
      <div>
        <label class="block text-gray-700 font-medium mb-1">Select Device</label>
        <select
          v-model="selectedDevice"
          class="w-full border rounded px-3 py-2"
          :disabled="deviceStore.loading"
        >
          <option disabled value="">-- Choose a device --</option>
          <option v-for="device in deviceStore.devices" :key="device.id" :value="device.id">
            {{ device.name }} ({{ device.ip_address }})
          </option>
        </select>
        <p v-if="deviceStore.error" class="text-red-600 text-sm mt-1">{{ deviceStore.error }}</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
          @click="handlePullUsers"
          :disabled="syncStore.loading || !selectedDevice"
        >
          Pull Users
        </button>

        <button
          class="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2"
          @click="handlePushUsers"
          :disabled="syncStore.loading || !selectedDevice"
        >
          Push Users
        </button>

        <button
          class="bg-purple-600 hover:bg-purple-700 text-white rounded px-4 py-2"
          @click="handlePullFps"
          :disabled="syncStore.loading || !selectedDevice"
        >
          Pull Fingerprints
        </button>

        <button
          class="bg-yellow-600 hover:bg-yellow-700 text-white rounded px-4 py-2"
          @click="handlePushFps"
          :disabled="syncStore.loading || !selectedDevice"
        >
          Push Fingerprints
        </button>
      </div>

      <!-- Message & Error -->
      <div v-if="syncStore.loading" class="text-blue-600 font-semibold">Syncing in progress...</div>

      <div v-if="syncStore.message" class="text-green-700 font-medium">
        ✅ {{ syncStore.message }}
      </div>

      <div v-if="syncStore.error" class="text-red-600 font-medium">❌ {{ syncStore.error }}</div>
    </div>

    <div class="card-bg p-4 md:p-6 space-y-4">
      <h2 class="text-lg font-semibold">👤 Create User on Device</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          v-model="userForm.zk_uid"
          type="number"
          placeholder="UID"
          class="border px-3 py-2 rounded w-full"
        />
        <input
          v-model="userForm.zk_userid"
          type="text"
          placeholder="User ID"
          class="border px-3 py-2 rounded w-full"
        />
        <input
          v-model="userForm.name"
          type="text"
          placeholder="Name"
          class="border px-3 py-2 rounded w-full"
        />
        <input
          v-model="userForm.password"
          type="text"
          placeholder="Password (optional)"
          class="border px-3 py-2 rounded w-full"
        />
        <input
          v-model="userForm.cardno"
          type="number"
          placeholder="Card No (optional)"
          class="border px-3 py-2 rounded w-full"
        />
        <select v-model="userForm.role" class="border px-3 py-2 rounded w-full">
          <option :value="0">User</option>
          <option :value="14">Admin</option>
        </select>
      </div>

      <button
        class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
        @click="handleCreateUser"
        :disabled="syncStore.loading || !selectedDevice"
      >
        ➕ Create User
      </button>
    </div>
  </div>
</template>
