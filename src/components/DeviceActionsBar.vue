<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useZKUserStore } from '@/stores/zk-user.js' // fetchUsers() রাখছি
import { useZktecoStore } from '@/stores/zkteco.js' // ✅ নতুন স্টোর

const props = defineProps({
  devices: { type: Array, default: () => [] },
})

const toast = useToast()
const userStore = useZKUserStore()
const zkStore = useZktecoStore() // ✅ ইনস্ট্যান্স

const deviceId = ref('')
const loading = ref(false)

const hasDevices = computed(() => Array.isArray(props.devices) && props.devices.length > 0)

// ✅ useZktecoStore দিয়ে Pull
async function pullFromDevice() {
  if (!deviceId.value) return toast.error('Enter a Device ID first')
  try {
    loading.value = true
    const res = await zkStore.pull({ deviceId: deviceId.value, what: 'both' })

    // বিভিন্ন রেসপন্স-কি ফ্যালব্যাক
    const pulledUsers = res?.users_added ?? res?.pulled_users ?? res?.users ?? 0
    const pulledTemplates = res?.fingers_added ?? res?.pulled_templates ?? res?.templates ?? 0

    toast.success(
      `Pulled from device #${deviceId.value}: users ${pulledUsers}, templates ${pulledTemplates}`,
    )

    // সেন্ট্রাল লিস্ট রিফ্রেশ
    await userStore.fetchUsers()
  } catch (e) {
    toast.error(e?.error || e?.message || 'Pull failed')
  } finally {
    loading.value = false
  }
}

// ✅ useZktecoStore দিয়ে Push (all)
async function pushAllToDevice() {
  if (!deviceId.value) return toast.error('Enter a Device ID first')
  try {
    loading.value = true
    const res = await zkStore.push({
      deviceId: deviceId.value,
      what: 'both',
      scope: 'all',
      disableDuringSync: true,
    })

    const pushedUsers = res?.users_pushed ?? res?.users ?? 0
    const pushedTemplates = res?.fingers_pushed ?? res?.templates ?? 0

    toast.success(
      `Pushed to device #${deviceId.value}: users ${pushedUsers}, templates ${pushedTemplates}`,
    )
  } catch (e) {
    toast.error(e?.error || e?.message || 'Push failed')
  } finally {
    loading.value = false
  }
}

// countOnDevice আগের মতই থাকুক (আপনি চাইলে পরে devices-store দিয়ে বদলাতে পারবেন)
async function countOnDevice() {
  if (!deviceId.value) return toast.error('Enter a Device ID first')
  try {
    loading.value = true
    const res = await userStore.userCountOnDevice(deviceId.value)
    const c = Number(res?.user_count ?? 0)
    toast.info(
      `Device #${deviceId.value}: users = ${c}${res?.online === false ? ' (offline)' : ''}`,
    )
  } catch (e) {
    toast.error(e?.message || 'Count failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 bg-slate-50 border rounded-lg p-3">
    <div class="text-sm text-slate-600">Device actions:</div>

    <!-- যদি devices prop থাকে, সিলেক্ট দেখাই; নাহলে numeric ইনপুট -->
    <select v-if="hasDevices" v-model="deviceId" class="border rounded px-2 py-1 text-sm min-w-48">
      <option value="" disabled>Select a device…</option>
      <option v-for="d in devices" :key="d.id" :value="String(d.id)">
        #{{ d.id }} — {{ d.name || d.ip_address }}
      </option>
    </select>
    <input
      v-else
      v-model="deviceId"
      type="number"
      min="1"
      placeholder="Device ID"
      class="border rounded px-2 py-1 text-sm w-28"
    />

    <button class="btn" @click="pullFromDevice" :disabled="loading">
      <i class="fas fa-download mr-1"></i> Pull Users
    </button>
    <button class="btn" @click="pushAllToDevice" :disabled="loading">
      <i class="fas fa-upload mr-1"></i> Push All
    </button>
    <button class="btn" @click="countOnDevice" :disabled="loading">
      <i class="fas fa-list-ol mr-1"></i> Count
    </button>

    <span v-if="loading" class="ml-auto text-xs text-slate-500">
      <i class="fas fa-circle-notch fa-spin"></i> Working…
    </span>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50;
}
</style>
