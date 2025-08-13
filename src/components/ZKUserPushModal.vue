<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useZKFingerStore } from '@/stores/zk-finger'
import { useZKUserStore } from '@/stores/zk-user'

const props = defineProps({
  show: { type: Boolean, default: false },
  user: { type: Object, default: null },
  devices: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'pushed'])

const fingerStore = useZKFingerStore()
const zkUserStore = useZKUserStore()
const toast = useToast()

const selectedDeviceIds = ref([])
const diff = ref(true)
const working = ref(false)

// কী কী পুশ হবে (ডিফল্ট দুইটাই অন)
const pushUserBasic = ref(true)
const pushFingers = ref(true)

const activeDevices = computed(() => (props.devices || []).filter((d) => d.status === 'active'))

watch(
  () => props.show,
  (v) => {
    if (v) {
      selectedDeviceIds.value = []
      diff.value = true
      pushUserBasic.value = true
      pushFingers.value = true
    }
  },
)

function close() {
  if (!working.value) emit('close')
}

function selectAll() {
  selectedDeviceIds.value = activeDevices.value.map((d) => d.id)
}
function clearAll() {
  selectedDeviceIds.value = []
}

async function pushNow() {
  if (!props.user) {
    toast.error('Invalid user')
    return
  }
  if (!selectedDeviceIds.value.length) {
    toast.warning('Select at least one device')
    return
  }
  if (!pushUserBasic.value && !pushFingers.value) {
    toast.warning('Select at least one action')
    return
  }

  try {
    working.value = true

    let userRes = null
    let fpRes = null

    // 1) User profile push (optional)
    if (pushUserBasic.value) {
      userRes = await zkUserStore.pushUserToDevices(props.user.zk_userid, {
        deviceIds: selectedDeviceIds.value,
        diff: diff.value,
      })
    }

    // 2) Fingerprints push (optional)
    if (pushFingers.value) {
      fpRes = await fingerStore.pushUserFingersToDevices(props.user.zk_userid, {
        deviceIds: selectedDeviceIds.value,
        diff: diff.value,
      })
    }

    // ✅ Summary toast
    if (pushUserBasic.value && userRes) {
      const pushed = userRes.pushed ?? (userRes.results?.filter((r) => r.pushed).length || 0)
      const skipped = userRes.skipped ?? (userRes.results?.filter((r) => r.skipped).length || 0)
      const offline =
        userRes.offline ?? (userRes.results?.filter((r) => r.error === 'offline').length || 0)
      const targets = userRes.targets ?? selectedDeviceIds.value.length
      toast.success(
        `User: pushed ${pushed}/${targets}` +
          (skipped ? `, skipped ${skipped}` : '') +
          (offline ? `, offline ${offline}` : ''),
      )
    }

    if (pushFingers.value && fpRes) {
      const pushedDevices = fpRes.results?.filter((r) => (r.pushed || 0) > 0).length || 0
      const skippedTotal = (fpRes.results || []).reduce((a, r) => a + (r.skipped || 0), 0)
      const offline = fpRes.results?.filter((r) => r.error === 'offline').length || 0
      const targets = fpRes.targets ?? selectedDeviceIds.value.length
      toast.success(
        `Fingerprints: pushed to ${pushedDevices}/${targets}` +
          (skippedTotal ? `, skipped ${skippedTotal}` : '') +
          (offline ? `, offline ${offline}` : ''),
      )
    }

    emit('pushed', { user: userRes, fingerprints: fpRes })
    emit('close')
  } catch (e) {
    toast.error(e?.message || 'Push failed')
  } finally {
    working.value = false
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/40" @click="close"></div>

    <div class="absolute inset-0 grid place-items-center p-4">
      <div class="relative w-full max-w-2xl rounded-xl bg-white p-5 shadow">
        <!-- overlay while working -->
        <div
          v-if="working"
          class="absolute inset-0 grid place-items-center rounded-xl bg-white/60 z-10"
        >
          <i class="fas fa-circle-notch fa-spin text-2xl"></i>
        </div>

        <div class="flex items-start justify-between gap-4">
          <h3 class="text-lg font-semibold">Push User to Devices</h3>
          <button class="text-gray-500 hover:text-gray-700" @click="close" title="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- User summary -->
        <div class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <div class="text-gray-500">ZK UID</div>
            <div class="font-medium">{{ user?.zk_uid }}</div>
          </div>
          <div>
            <div class="text-gray-500">Device User ID</div>
            <div class="font-medium">{{ user?.zk_userid }}</div>
          </div>
          <div>
            <div class="text-gray-500">Name (Device)</div>
            <div class="font-medium">{{ user?.name }}</div>
          </div>
          <div>
            <div class="text-gray-500">Name (Software)</div>
            <div class="font-medium">{{ user?.user?.name || '—' }}</div>
          </div>
        </div>

        <hr class="my-4" />

        <!-- Device select -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">
              Select target devices (active)
              <span v-if="selectedDeviceIds.length" class="ml-2 text-gray-500">
                • Selected: {{ selectedDeviceIds.length }}
              </span>
            </div>
            <div class="flex gap-2">
              <button class="px-2 py-1 rounded border" @click="selectAll">Select all</button>
              <button class="px-2 py-1 rounded border" @click="clearAll">Clear</button>
            </div>
          </div>

          <div v-if="!activeDevices.length" class="text-sm text-red-600">
            No active devices found.
          </div>

          <div v-else class="grid gap-2 max-h-56 overflow-auto sm:grid-cols-2">
            <label
              v-for="d in activeDevices"
              :key="d.id"
              class="flex items-center gap-2 rounded border p-2"
            >
              <input type="checkbox" v-model="selectedDeviceIds" :value="d.id" />
              <div class="flex flex-col leading-tight">
                <span class="font-medium">{{ d.name }}</span>
                <span class="text-xs text-gray-500">{{ d.ip_address }} : {{ d.port }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Options -->
        <div class="mt-4 space-y-2">
          <div class="text-sm font-medium">What to push</div>

          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="pushUserBasic" />
            <span>Push user profile (basic)</span>
          </label>

          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="pushFingers" />
            <span>Push fingerprints</span>
          </label>

          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="diff" />
            <span>Send missing only (diff)</span>
          </label>
        </div>

        <!-- Actions -->
        <div class="mt-5 flex justify-end gap-2">
          <button class="px-3 py-2 border rounded" :disabled="working" @click="close">
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded bg-purple-600 text-white"
            :disabled="working || !selectedDeviceIds.length || (!pushUserBasic && !pushFingers)"
            @click="pushNow"
            title="Push to selected devices"
          >
            <i v-if="working" class="fas fa-circle-notch fa-spin mr-2"></i>
            <span>{{ working ? 'Pushing...' : 'Push now' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
