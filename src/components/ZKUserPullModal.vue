<script setup>
import { ref, watch, computed } from 'vue'
import { useZKFingerStore } from '@/stores/zk-finger'

const props = defineProps({
  show: { type: Boolean, default: false },
  user: { type: Object, default: null }, // expects user.zk_userid
  devices: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'pulled'])

const fingerStore = useZKFingerStore()

const selectedDeviceId = ref(null)
const loading = ref(false)
const error = ref(null)

// মোডাল ওপেন হলে প্রথম ডিভাইসটা ডিফল্ট সিলেক্ট
watch(
  () => props.show,
  (v) => {
    if (v) {
      error.value = null
      loading.value = false
      selectedDeviceId.value = props.devices?.[0]?.id ?? null
    }
  },
)

const deviceOptions = computed(() =>
  (props.devices || []).map((d) => ({
    id: d.id,
    label: (d.name || d.title || `Device #${d.id}`) + (d.ip_address ? ` — ${d.ip_address}` : ''),
  })),
)

function close() {
  if (!loading.value) emit('close')
}

async function submitPull() {
  if (!props.user?.zk_userid) {
    error.value = 'Invalid user (missing zk_userid)'
    return
  }
  if (!selectedDeviceId.value) {
    error.value = 'Please select a device'
    return
  }

  loading.value = true
  error.value = null
  try {
    const res = await fingerStore.pullUserFingersFromDevice(
      Number(selectedDeviceId.value),
      String(props.user.zk_userid),
    )
    // res: { fingers_pulled, fingers:[], user_present, ... }
    emit('pulled', { ...res, device_id: Number(selectedDeviceId.value) })
    emit('close')
  } catch (e) {
    error.value = e?.message || e?.error || 'Pull failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Overlay -->
    <div class="absolute inset-0 bg-black/40" @click="close"></div>

    <!-- Modal -->
    <div class="relative z-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold">Pull fingerprints (single device)</h3>
        <button class="text-gray-500 hover:text-gray-700" @click="close" title="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="space-y-4">
        <div class="rounded-md bg-gray-50 p-3 text-sm">
          <div>
            <span class="font-medium">User (device user id):</span> {{ user?.zk_userid || '—' }}
          </div>
          <div>
            <span class="font-medium">Name:</span> {{ user?.name || user?.user?.name || '—' }}
          </div>
        </div>

        <div>
          <label class="label">Select device</label>
          <select
            v-model="selectedDeviceId"
            class="input-1 w-full"
            :disabled="!deviceOptions.length || loading"
          >
            <option v-for="d in deviceOptions" :key="d.id" :value="d.id">
              {{ d.label }}
            </option>
          </select>
          <p v-if="!deviceOptions.length" class="mt-2 text-sm text-gray-500">
            No devices found. Please add devices first.
          </p>
        </div>

        <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {{ error }}
        </p>
      </div>

      <div class="mt-6 flex items-center justify-end gap-2">
        <button class="btn-3" @click="close" :disabled="loading">Cancel</button>
        <button class="btn-2" @click="submitPull" :disabled="loading || !deviceOptions.length">
          <span v-if="loading" class="inline-flex items-center gap-2">
            <i class="fas fa-spinner fa-spin"></i> Pulling...
          </span>
          <span v-else class="inline-flex items-center gap-2">
            <i class="fas fa-download"></i> Pull
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
