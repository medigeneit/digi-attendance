<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useDeviceStore } from '@/stores/zk-device.js' // ← তোমার path

const props = defineProps({
  device: { type: Object, required: true },
})
const emit = defineEmits(['edit', 'delete', 'refresh'])

const toast = useToast()
const store = useDeviceStore()

// busy state
const busy = ref(false)
const busyLabel = ref('')

// modal state
const modal = ref({
  open: false,
  title: '',
  view: 'json', // 'json' | 'kv' | 'users' | 'diff'
  data: null,
})
function openModal(title, view, data) {
  modal.value = { open: true, title, view, data }
}
function closeModal() {
  modal.value.open = false
  modal.value.data = null
}

function setBusy(label) {
  busy.value = true
  busyLabel.value = label
}
function clearBusy() {
  busy.value = false
  busyLabel.value = ''
}

const statusClass = computed(() => {
  const s = props.device.status
  if (s === 'active') return 'bg-green-50 text-green-700 ring-1 ring-green-200'
  if (s === 'inactive') return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
  return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
})

// helpers: normalize live users payload to a consistent array of objects
function normalizeUsersResponse(res) {
  // 1) বের করো raw array
  let arr = []
  if (Array.isArray(res)) {
    arr = res
  } else if (Array.isArray(res?.data)) {
    arr = res.data
  } else if (res?.data && typeof res.data === 'object') {
    // data যদি object হয় (numeric keys) → values নাও
    arr = Object.values(res.data)
  } else if (res && typeof res === 'object') {
    // res নিজেই object হলে (numeric keys) → values নাও
    arr = Object.values(res)
  }

  // 2) প্রতিটা row-কে {userid,name,role,cardno,uid} বানাও
  return arr.map((u) => {
    if (Array.isArray(u)) {
      // [userid, name, cardno, uid, role, password]
      return {
        userid: u[0] ?? '',
        name: u[1] ?? '',
        cardno: u[2] ?? '',
        uid: u[3] ?? '',
        role: u[4] ?? '',
      }
    }
    // object হলে common aliases হ্যান্ডেল করো
    return {
      userid: u.userid ?? u.user_id ?? u.enroll ?? u.id ?? '',
      name: u.name ?? '',
      role: u.role ?? '',
      cardno: u.cardno ?? u.card ?? '',
      uid: u.uid ?? u.device_uid ?? '',
    }
  })
}

// helpers
function formatDtLocalToSql(val) {
  if (!val) return ''
  const t = val.replace('T', ' ')
  return t.length === 16 ? `${t}:00` : t
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
function pretty(data) {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// time modal form
const timeFormOpen = ref(false)
const dtLocal = ref('')

// actions (সবগুলো device store ভিত্তিক)
async function onCheck() {
  try {
    setBusy('checking')
    const res = await store.ping(props.device.id)
    // আগের json এর বদলে fixed view:
    openModal('Connection Result', 'connection', res)
    toast.success('Connection checked')
  } catch (e) {
    openModal('Connection Error', 'json', e?.response?.data || { message: e?.message || 'Failed' })
    toast.error(e?.message || 'Connection check failed')
  } finally {
    clearBusy()
  }
}

async function onInfo() {
  try {
    setBusy('loading info')
    const res = await store.info(props.device.id)
    // API কখনো data.data, কখনো data—দুটোই সাপোর্ট
    const d = res?.data || res
    openModal('Device Info', 'kv', d)
  } catch (e) {
    openModal('Device Info — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Failed to load device info')
  } finally {
    clearBusy()
  }
}

async function onEnable() {
  try {
    setBusy('enabling')
    const res = await store.enable(props.device.id)
    openModal('Enable Device', 'json', res)
    toast[res.ok ? 'success' : 'error'](res.message || (res.ok ? 'Enabled' : 'Enable failed'))
    emit('refresh')
  } catch (e) {
    openModal('Enable Device — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Enable failed')
  } finally {
    clearBusy()
  }
}

async function onDisable() {
  try {
    setBusy('disabling')
    const res = await store.disable(props.device.id)
    openModal('Disable Device', 'json', res)
    toast[res.ok ? 'success' : 'error'](res.message || (res.ok ? 'Disabled' : 'Disable failed'))
    emit('refresh')
  } catch (e) {
    openModal('Disable Device — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Disable failed')
  } finally {
    clearBusy()
  }
}

async function onRestart() {
  try {
    setBusy('restarting')
    const res = await store.restart(props.device.id)
    openModal('Restart Device', 'json', res)
    toast[res.ok ? 'success' : 'error'](res.message || (res.ok ? 'Restart sent' : 'Restart failed'))
  } catch (e) {
    openModal('Restart Device — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Restart failed')
  } finally {
    clearBusy()
  }
}

async function onShutdown() {
  try {
    setBusy('shutting down')
    const res = await store.shutdown(props.device.id)
    openModal('Shutdown Device', 'json', res)
    toast[res.ok ? 'success' : 'error'](
      res.message || (res.ok ? 'Shutdown sent' : 'Shutdown failed'),
    )
  } catch (e) {
    openModal('Shutdown Device — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Shutdown failed')
  } finally {
    clearBusy()
  }
}

async function onTestVoice() {
  try {
    setBusy('testing voice')
    const res = await store.testVoice(props.device.id)
    openModal('Test Voice', 'json', res)
    toast[res.ok ? 'success' : 'error'](
      res.message || (res.ok ? 'Voice test sent' : 'Voice test failed'),
    )
  } catch (e) {
    openModal('Test Voice — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Voice test failed')
  } finally {
    clearBusy()
  }
}

async function onApplyTime() {
  try {
    const sql = formatDtLocalToSql(dtLocal.value)
    if (!sql) return toast.error('Pick a date & time first')
    setBusy('setting time')
    const res = await store.setTime(props.device.id, { datetime: sql })
    openModal('Set Device Time', 'json', res)
    toast[res.ok ? 'success' : 'error'](res.message || (res.ok ? 'Time set' : 'Failed to set time'))
    timeFormOpen.value = false
  } catch (e) {
    openModal('Set Device Time — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Failed to set time')
  } finally {
    clearBusy()
  }
}

async function onUsersLive() {
  try {
    setBusy('users-live')
    const res = await store.usersLive(props.device.id)
    const rows = normalizeUsersResponse(res) // ✅ normalize
    openModal(`Live Users (${rows.length})`, 'users', rows)
  } catch (e) {
    openModal('Live Users — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Failed to load users')
  } finally {
    clearBusy()
  }
}

async function onUsersDiff() {
  try {
    setBusy('diff users')
    const res = await store.usersDiff(props.device.id, { include_inactive: false })
    openModal('Users Diff', 'diff', res)
  } catch (e) {
    openModal('Users Diff — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Failed to diff users')
  } finally {
    clearBusy()
  }
}

async function onImportUsers(ev) {
  const file = ev.target.files?.[0]
  if (!file) return
  try {
    setBusy('importing users')
    const res = await store.importUsers(props.device.id, file, { pushNow: true })
    openModal('Import Users', 'json', res)
    toast.success(`Imported: ${res.imported_users ?? 0}`)
  } catch (e) {
    openModal('Import Users — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Import failed')
  } finally {
    ev.target.value = ''
    clearBusy()
  }
}

async function onExportUsers() {
  try {
    setBusy('exporting users')
    const blob = await store.exportUsers(props.device.id)
    const name = `device_${props.device.id}_users.csv`
    downloadBlob(blob, name)
    openModal('Export Users', 'json', { ok: true, message: `CSV downloaded as ${name}` })
    toast.success('Exported users CSV')
  } catch (e) {
    openModal('Export Users — Error', 'json', e?.response?.data || { message: e?.message })
    toast.error(e?.message || 'Export failed')
  } finally {
    clearBusy()
  }
}

function onEdit() {
  emit('edit', props.device)
}
function onDelete() {
  emit('delete', props.device)
}
</script>

<template>
  <div
    class="relative rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition"
  >
    <!-- gradient header -->
    <div class="rounded-t-2xl bg-gradient-to-r from-blue-900 to-blue-700 px-4 py-3 text-white">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 grid place-items-center rounded-lg bg-white/10">
            <i class="fas fa-microchip text-white/90"></i>
          </div>
          <div>
            <div class="text-sm font-semibold leading-tight">{{ device.name }}</div>
            <div class="text-[11px] text-white/70 leading-tight">
              {{ device.ip_address }} : {{ device.port }}
            </div>
          </div>
        </div>
        <span class="text-[11px] px-2 py-0.5 rounded-full font-medium" :class="statusClass">
          {{ device.status }}
        </span>
      </div>
    </div>

    <!-- overlay -->
    <div v-if="busy" class="absolute inset-0 bg-white/70 grid place-items-center rounded-2xl z-10">
      <div class="flex items-center gap-2 text-slate-700">
        <i class="fas fa-circle-notch fa-spin"></i>
        <span class="text-sm capitalize">{{ busyLabel }}</span>
      </div>
    </div>

    <!-- body -->
    <div class="p-4">
      <!-- action grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button class="btn-tile" :disabled="busy" @click="onCheck">
          <i class="fas fa-plug"></i><span>Check</span>
        </button>

        <button class="btn-tile" :disabled="busy" @click="onInfo">
          <i class="fas fa-info-circle"></i><span>Info</span>
        </button>

        <button
          class="btn-tile text-emerald-700 ring-emerald-200 bg-emerald-50"
          :disabled="busy"
          @click="onEnable"
        >
          <i class="fas fa-toggle-on"></i><span>Enable</span>
        </button>

        <button
          class="btn-tile text-amber-700 ring-amber-200 bg-amber-50"
          :disabled="busy"
          @click="onDisable"
        >
          <i class="fas fa-toggle-off"></i><span>Disable</span>
        </button>

        <button
          class="btn-tile text-indigo-700 ring-indigo-200 bg-indigo-50"
          :disabled="busy"
          @click="onRestart"
        >
          <i class="fas fa-undo"></i><span>Restart</span>
        </button>

        <button
          class="btn-tile text-rose-700 ring-rose-200 bg-rose-50"
          :disabled="busy"
          @click="onShutdown"
        >
          <i class="fas fa-power-off"></i><span>Shutdown</span>
        </button>

        <button
          class="btn-tile text-purple-700 ring-purple-200 bg-purple-50"
          :disabled="busy"
          @click="onTestVoice"
        >
          <i class="fas fa-volume-up"></i><span>Test Voice</span>
        </button>

        <button class="btn-tile" :disabled="busy" @click="timeFormOpen = true">
          <i class="far fa-clock"></i><span>Set Time</span>
        </button>

        <button class="btn-tile" :disabled="busy" @click="onUsersLive">
          <i class="fas fa-users"></i><span>Users (Live)</span>
        </button>

        <button class="btn-tile" :disabled="busy" @click="onUsersDiff">
          <i class="fas fa-code-branch"></i><span>Users Diff</span>
        </button>

        <label class="btn-tile cursor-pointer">
          <i class="fas fa-file-import"></i><span>Import CSV</span>
          <input type="file" accept=".csv,text/csv" class="hidden" @change="onImportUsers" />
        </label>

        <button class="btn-tile" :disabled="busy" @click="onExportUsers">
          <i class="fas fa-file-export"></i><span>Export CSV</span>
        </button>

        <button
          class="btn-tile col-span-2 sm:col-span-1 text-blue-700 ring-blue-200 bg-blue-50"
          @click="onEdit"
        >
          <i class="fas fa-edit"></i><span>Edit</span>
        </button>

        <button
          class="btn-tile col-span-2 sm:col-span-1 text-rose-700 ring-rose-200 bg-rose-50"
          :disabled="busy"
          @click="onDelete"
        >
          <i class="fas fa-trash"></i><span>Delete</span>
        </button>
      </div>
    </div>

    <!-- Set Time Modal -->
    <div v-if="timeFormOpen" class="modal-bg">
      <div class="modal-card">
        <div class="flex items-center justify-between px-4 py-3 border-b">
          <div class="font-semibold">Set Device Time</div>
          <button class="text-slate-500 hover:text-slate-800" @click="timeFormOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-4 space-y-3">
          <label class="text-sm text-slate-600">Pick date & time</label>
          <input
            type="datetime-local"
            v-model="dtLocal"
            class="w-full border rounded px-3 py-2 text-sm"
          />
          <div class="flex justify-end gap-2 pt-2">
            <button class="px-3 py-1.5 text-sm rounded border" @click="timeFormOpen = false">
              Cancel
            </button>
            <button
              class="px-3 py-1.5 text-sm rounded bg-slate-900 text-white"
              :disabled="busy"
              @click="onApplyTime"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Generic Result Modal -->
    <div v-if="modal.open" class="modal-bg">
      <div class="modal-card">
        <div class="flex items-center justify-between px-4 py-3 border-b">
          <div class="font-semibold">{{ modal.title }}</div>
          <button class="text-slate-500 hover:text-slate-800" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="max-h-[70vh] overflow-auto text-sm">
          <!-- Connection view (fixed design) -->
          <div v-if="modal.view === 'connection'" class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-[13px] text-slate-700">
                <b>Device:</b> {{ modal.data?.device_name }} (ID: {{ modal.data?.device_id }})
              </div>
              <span
                class="px-2 py-0.5 rounded-full text-[12px] font-medium"
                :class="
                  (modal.data?.success ?? modal.data?.online)
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                "
              >
                {{ (modal.data?.success ?? modal.data?.online) ? 'Online' : 'Offline' }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
              <div><b>Method:</b> {{ modal.data?.method || '-' }}</div>
              <div>
                <b>Latency:</b> {{ modal.data?.latency_ms ? modal.data.latency_ms + ' ms' : '-' }}
              </div>
              <div class="sm:col-span-3">
                <b>IP:Port:</b> {{ modal.data?.ip_address }} : {{ modal.data?.port }}
              </div>
            </div>

            <!-- Offline diagnostics -->
            <div v-if="!(modal.data?.success ?? modal.data?.online)">
              <div class="text-[12px] text-slate-600 font-medium mb-1">Errors</div>
              <div class="overflow-auto max-h-[40vh]">
                <table class="w-full text-[12px]">
                  <thead class="text-left sticky top-0 bg-white">
                    <tr>
                      <th class="pr-2 py-1 border-b">Mode</th>
                      <th class="pr-2 py-1 border-b">Error</th>
                      <th class="py-1 border-b">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(e, i) in modal.data?.errors || []" :key="i" class="border-b">
                      <td class="pr-2 py-1 uppercase">{{ e.mode }}</td>
                      <td class="pr-2 py-1">{{ e.error }}</td>
                      <td class="py-1">{{ e.latency_ms ? e.latency_ms + ' ms' : '-' }}</td>
                    </tr>
                    <tr v-if="!(modal.data?.errors || []).length">
                      <td class="py-2 text-slate-500 text-center" colspan="3">No error details</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Key-Value view (device info) -->
          <div
            v-else-if="modal.view === 'kv'"
            class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]"
          >
            <div><b>Name:</b> {{ modal.data?.device_name }}</div>
            <div><b>Version:</b> {{ modal.data?.version }}</div>
            <div><b>OS:</b> {{ modal.data?.os_version }}</div>
            <div><b>Platform:</b> {{ modal.data?.platform }}</div>
            <div><b>FM:</b> {{ modal.data?.fm_version }}</div>
            <div><b>Serial:</b> {{ modal.data?.serial }}</div>
            <div><b>Pin Width:</b> {{ modal.data?.pin_width }}</div>
            <div><b>Time:</b> {{ modal.data?.time }}</div>
            <div class="sm:col-span-2">
              <b>IP:Port:</b> {{ modal.data?.ip }} : {{ modal.data?.port }}
            </div>
          </div>

          <!-- Users table -->
          <div v-else-if="modal.view === 'users'">
            <div class="mb-2 text-[13px] text-slate-600">
              Total: {{ (modal.data || []).length }}
            </div>
            <div class="overflow-auto max-h-[55vh]">
              <table class="w-full text-[12px]">
                <thead class="text-left sticky top-0 bg-white">
                  <tr>
                    <th class="pr-2 py-1 border-b">UserID</th>
                    <th class="pr-2 py-1 border-b">Name</th>
                    <th class="pr-2 py-1 border-b">Role</th>
                    <th class="pr-2 py-1 border-b">Card</th>
                    <th class="py-1 border-b">UID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(u, i) in modal.data" :key="u.userid || i" class="border-b">
                    <td class="pr-2 py-1">{{ u.userid }}</td>
                    <td class="pr-2 py-1">{{ u.name }}</td>
                    <td class="pr-2 py-1">{{ u.role }}</td>
                    <td class="pr-2 py-1">{{ u.cardno }}</td>
                    <td class="py-1">{{ u.uid }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Diff view -->
          <div v-else-if="modal.view === 'diff'" class="space-y-3">
            <div class="flex flex-wrap gap-2 text-[12px]">
              <span class="px-2 py-0.5 rounded bg-gray-100"
                >Device: {{ modal.data?.summary?.device_total }}</span
              >
              <span class="px-2 py-0.5 rounded bg-gray-100"
                >Central: {{ modal.data?.summary?.central_total }}</span
              >
              <span class="px-2 py-0.5 rounded bg-emerald-100"
                >Create: {{ modal.data?.summary?.create }}</span
              >
              <span class="px-2 py-0.5 rounded bg-amber-100"
                >Update: {{ modal.data?.summary?.update }}</span
              >
              <span class="px-2 py-0.5 rounded bg-rose-100"
                >Remove: {{ modal.data?.summary?.remove }}</span
              >
            </div>

            <details>
              <summary class="cursor-pointer font-medium">Create</summary>
              <ul class="list-disc ml-6 text-[12px]">
                <li v-for="x in modal.data?.create || []" :key="`c-${x.userid}`">
                  {{ x.userid }} — {{ x.name }}
                </li>
              </ul>
            </details>

            <details>
              <summary class="cursor-pointer font-medium">Update</summary>
              <ul class="list-disc ml-6 text-[12px]">
                <li v-for="x in modal.data?.update || []" :key="`u-${x.userid}`">
                  {{ x.userid }}
                </li>
              </ul>
            </details>

            <details>
              <summary class="cursor-pointer font-medium">Remove</summary>
              <ul class="list-disc ml-6 text-[12px]">
                <li v-for="x in modal.data?.remove || []" :key="`r-${x.userid}`">
                  {{ x.userid }}
                </li>
              </ul>
            </details>
          </div>
        </div>

        <div class="flex justify-end gap-2 px-4 py-3 border-t">
          <button class="px-3 py-1.5 text-sm rounded bg-slate-900 text-white" @click="closeModal">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-tile {
  @apply w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 ring-1 ring-transparent hover:ring-slate-200 hover:shadow-sm transition;
}
</style>
