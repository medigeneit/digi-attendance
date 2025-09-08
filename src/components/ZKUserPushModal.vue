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
const workingUser = ref(false)
const workingFingers = ref(false)

const activeDevices = computed(() => (props.devices || []).filter((d) => d.status === 'active'))

watch(
  () => props.show,
  (v) => {
    if (v) {
      selectedDeviceIds.value = []
      workingUser.value = false
      workingFingers.value = false
    }
  },
)

function close() {
  if (!workingUser.value && !workingFingers.value) emit('close')
}

function selectAll() {
  selectedDeviceIds.value = activeDevices.value.map((d) => d.id)
}
function clearAll() {
  selectedDeviceIds.value = []
}

async function pushUserProfiles() {
  if (!props.user?.userid) return toast.error('Invalid user')
  if (!selectedDeviceIds.value.length) return toast.warning('Select at least one device')

  workingUser.value = true
  try {
    const ids = [...selectedDeviceIds.value]
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await zkUserStore.pushSingleUserToDevice(id, props.user.userid)
        return { deviceId: id, res }
      }),
    )

    let created = 0
    let already = 0
    let failed = 0

    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        const { res } = r.value
        created += Number(res?.pushed || 0)
        already += Number(res?.already || 0)
      } else {
        failed++
      }
    })

    toast.success(`User push done → created: ${created}, already: ${already}, failed: ${failed}`)
    emit('pushed', { type: 'user', created, already, failed })
  } catch (e) {
    toast.error(e?.message || 'User push failed')
  } finally {
    workingUser.value = false
  }
}

async function pushFingerprints() {
  if (!props.user?.userid) return toast.error('Invalid user')
  if (!selectedDeviceIds.value.length) return toast.warning('Select at least one device')

  workingFingers.value = true
  try {
    const ids = [...selectedDeviceIds.value]
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await fingerStore.pushFingerprintsOne(id, props.user.userid)
        return { deviceId: id, res }
      }),
    )

    let pushed = 0
    let skipped = 0
    let createdUsers = 0
    let failed = 0

    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        const { res } = r.value
        pushed += Number(res?.pushed || 0)
        skipped += Number(res?.skipped || 0)
        createdUsers += Number(res?.created_users || res?.createdUsers || 0)
      } else {
        failed++
      }
    })

    toast.success(
      `Fingerprint push done → pushed: ${pushed}, skipped: ${skipped}, created users: ${createdUsers}, failed: ${failed}`,
    )
    emit('pushed', { type: 'fingers', pushed, skipped, createdUsers, failed })
  } catch (e) {
    toast.error(e?.message || 'Fingerprint push failed')
  } finally {
    workingFingers.value = false
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
          v-if="workingUser || workingFingers"
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
            <div class="font-medium">{{ user?.userid }}</div>
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

        <!-- Actions -->
        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <button
            class="px-3 py-2 border rounded"
            :disabled="workingUser || workingFingers"
            @click="close"
          >
            Cancel
          </button>

          <!-- Push ONLY user profile -->
          <button
            class="px-3 py-2 rounded bg-blue-600 text-white"
            :disabled="workingUser || workingFingers || !selectedDeviceIds.length"
            @click="pushUserProfiles"
            title="Push user profile to selected devices"
          >
            <i v-if="workingUser" class="fas fa-circle-notch fa-spin mr-2"></i>
            <span>{{ workingUser ? 'Pushing user...' : 'Push user' }}</span>
          </button>

          <!-- Push ONLY fingerprints -->
          <button
            class="px-3 py-2 rounded bg-purple-600 text-white"
            :disabled="workingUser || workingFingers || !selectedDeviceIds.length"
            @click="pushFingerprints"
            title="Push fingerprints to selected devices"
          >
            <i v-if="workingFingers" class="fas fa-circle-notch fa-spin mr-2"></i>
            <span>{{ workingFingers ? 'Pushing fingerprints...' : 'Push fingerprints' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
