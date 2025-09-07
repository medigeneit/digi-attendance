<!-- src/components/DeviceActionModal.vue -->
<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  mode: { type: String, default: 'push' }, // 'push' | 'remove'
  user: { type: Object, default: null },
  devices: { type: Array, default: () => [] },
  // নতুন: পুশের জন্য আলাদা লোডার
  loadingUser: { type: Boolean, default: false },
  loadingFp: { type: Boolean, default: false },
  // পুরনো remove লোডার আগের মতোই থাকবে
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm', 'confirm-user', 'confirm-fp'])
const selectedId = ref(null)

watch(
  () => props.show,
  (v) => {
    if (v) selectedId.value = null
  },
)

const title = computed(() => (props.mode === 'remove' ? 'Remove From Device' : 'Push To Device'))
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[60] grid place-items-center bg-black/30">
    <div class="bg-white rounded-xl shadow-xl w-[520px] max-w-[95vw]">
      <div class="px-4 py-3 border-b flex items-center justify-between">
        <div class="font-semibold">{{ title }}</div>
        <button class="text-slate-500 hover:text-slate-800" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="p-4 space-y-3 text-sm">
        <div class="text-slate-600">
          <div><b>User:</b> {{ user?.zk_userid }} — {{ user?.name }}</div>
          <div v-if="mode === 'push'">Select a device and choose what to push.</div>
          <div v-else>Select a device to <b>remove</b> this user from.</div>
        </div>

        <div>
          <label class="block text-xs text-slate-600 mb-1">Device</label>
          <select v-model="selectedId" class="border rounded px-3 py-2 w-full">
            <option :value="null" disabled>Select device</option>
            <option v-for="d in devices" :key="d.id" :value="d.id">
              #{{ d.id }} — {{ d.name }} ({{ d.ip_address }}:{{ d.port }})
            </option>
          </select>
        </div>

        <div class="text-[12px] text-slate-500">
          Tip: Make sure the device is online and reachable.
        </div>
      </div>

      <div class="px-4 py-3 border-t flex items-center justify-end gap-2">
        <button class="btn" @click="$emit('close')">Cancel</button>

        <!-- remove mode: আগের মতোই single confirm -->
        <button
          v-if="mode === 'remove'"
          class="btn-primary"
          :disabled="!selectedId || loading"
          @click="$emit('confirm', selectedId)"
        >
          <i v-if="!loading" class="fas fa-user-slash"></i>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
          <span class="ml-1">Confirm Remove</span>
        </button>

        <!-- push mode: দুইটা আলাদা বাটন -->
        <template v-else>
          <button
            class="btn-primary"
            :disabled="!selectedId || loadingUser"
            @click="$emit('confirm-user', selectedId)"
          >
            <i v-if="!loadingUser" class="fas fa-user-plus"></i>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
            <span class="ml-1">Push User</span>
          </button>
          <button
            class="btn-primary"
            :disabled="!selectedId || loadingFp"
            @click="$emit('confirm-fp', selectedId)"
          >
            <i v-if="!loadingFp" class="fas fa-fingerprint"></i>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
            <span class="ml-1">Push Fingerprints</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50;
}
.btn-primary {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-white text-sm hover:bg-slate-700;
}
</style>
