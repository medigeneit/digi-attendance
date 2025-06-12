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
  </div>
</template>
