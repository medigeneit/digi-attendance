<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useZKUserStore } from '@/stores/zk-user.js'
import { useDeviceStore } from '@/stores/zk-device.js'

import UserTable from '@/components/UserTable.vue'
import UserFormModal from '@/components/UserFormModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import DeviceActionModal from '@/components/DeviceActionModal.vue'

const deviceStore = useDeviceStore()
const devices = computed(() => deviceStore.devices)
const store = useZKUserStore()
const toast = useToast()

// UI states
const search = ref('')
const searching = ref(false)
const searchResults = ref([])
const deviceId = ref('') // device-scoped actions-এর জন্য
const loadingTop = ref(false)

// NEW: device action modal states
const showDeviceAction = ref(false)
const actionMode = ref('push') // 'push' | 'remove'
const actionUser = ref(null)
const actionBusy = ref(false)

// modal
const showForm = ref(false)
const editing = ref(null) // null => create
const showConfirm = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmAction = null
let confirmPayload = null

// computed users
const users = computed(() => (searching.value ? searchResults.value : store.users))

async function loadUsers() {
  await store.fetchUsers()
}

onMounted(async () => {
  await Promise.all([store.fetchUsers(), deviceStore.fetchDevices()])
})

async function doSearch() {
  if (!search.value) {
    searching.value = false
    searchResults.value = []
    return
  }
  try {
    loadingTop.value = true
    const res = await store.searchUsers(search.value, 50)
    searchResults.value = Array.isArray(res) ? res : []
    searching.value = true
  } catch (e) {
    toast.error(e?.message || 'Search failed')
  } finally {
    loadingTop.value = false
  }
}

function clearSearch() {
  search.value = ''
  searching.value = false
  searchResults.value = []
}

function openCreate() {
  editing.value = null
  showForm.value = true
}
function openEdit(u) {
  editing.value = u
  showForm.value = true
}
function closeForm() {
  showForm.value = false
}

async function saveForm(payload) {
  try {
    if (editing.value?.id) {
      await store.updateUser(editing.value.id, payload)
      toast.success('User updated')
    } else {
      await store.createUser(payload)
      toast.success('User created')
    }
    await loadUsers()
    showForm.value = false
  } catch (e) {
    toast.error(e?.message || 'Save failed')
  }
}

function askDelete(u) {
  confirmTitle.value = 'Delete User'
  confirmMessage.value = `Are you sure you want to delete "${u.name}" (Enroll ${u.zk_userid})?`
  confirmAction = async () => {
    await store.deleteUser(u.id)
    toast.warning('User deleted')
    await loadUsers()
  }
  confirmPayload = null
  showConfirm.value = true
}

function closeConfirm() {
  showConfirm.value = false
  confirmAction = null
  confirmPayload = null
}

async function runConfirm() {
  if (!confirmAction) return closeConfirm()
  try {
    await confirmAction(confirmPayload)
  } catch (e) {
    toast.error(e?.message || 'Operation failed')
  } finally {
    closeConfirm()
  }
}

// device-scoped: top-bar ops
async function pullFromDevice() {
  if (!deviceId.value) return toast.error('Enter a Device ID first')
  try {
    loadingTop.value = true
    const res = await store.pullUsersFromDevice(deviceId.value)
    toast.success(
      `Pulled from device#${deviceId.value}: seen ${res.seen ?? 0}, inserted ${res.inserted ?? 0}`,
    )
    await loadUsers()
  } catch (e) {
    toast.error(e?.message || 'Pull failed')
  } finally {
    loadingTop.value = false
  }
}

async function pushAllToDevice() {
  if (!deviceId.value) return toast.error('Enter a Device ID first')
  try {
    loadingTop.value = true
    const res = await store.pushAllUsersToDevice(deviceId.value)
    toast.success(
      `Pushed to device#${deviceId.value}: new ${res.pushed ?? 0}, already ${res.already ?? 0}`,
    )
  } catch (e) {
    toast.error(e?.message || 'Push failed')
  } finally {
    loadingTop.value = false
  }
}

async function countOnDevice() {
  if (!deviceId.value) return toast.error('Enter a Device ID first')
  try {
    loadingTop.value = true
    const res = await store.userCountOnDevice(deviceId.value)
    const c = Number(res?.user_count ?? 0)
    toast.info(`Device#${deviceId.value}: users = ${c}${res?.online === false ? ' (offline)' : ''}`)
  } catch (e) {
    toast.error(e?.message || 'Count failed')
  } finally {
    loadingTop.value = false
  }
}

// row-level device actions
async function pushOneToDevice(u) {
  if (!deviceId.value) return toast.error('Enter a Device ID first')
  try {
    const res = await store.pushSingleUserToDevice(deviceId.value, u.zk_userid)
    toast.success(
      `Pushed ${u.zk_userid} → device#${deviceId.value}: ${res?.pushed ? 'created' : 'already exists'}`,
    )
  } catch (e) {
    toast.error(e?.message || 'Push failed')
  }
}

async function removeOneFromDevice(u) {
  if (!deviceId.value) return toast.error('Enter a Device ID first')
  // confirm
  confirmTitle.value = 'Remove From Device'
  confirmMessage.value = `Remove user ${u.zk_userid} from device#${deviceId.value}?`
  confirmAction = async () => {
    const res = await store.removeUserFromDevice(deviceId.value, u.zk_userid)
    toast.warning(
      `Removed (${res?.removed ? 'ok' : 'maybe not'}) user ${u.zk_userid} from device#${deviceId.value}`,
    )
  }
  confirmPayload = null
  showConfirm.value = true
}

// row-level: এখন সরাসরি API না ডেকে মোডাল ওপেন করবো
function openPushOne(u) {
  actionUser.value = u
  actionMode.value = 'push'
  showDeviceAction.value = true
}
function openRemoveOne(u) {
  actionUser.value = u
  actionMode.value = 'remove'
  showDeviceAction.value = true
}

// modal confirm → নির্বাচিত deviceId নিয়ে call
async function onDeviceActionConfirm(deviceId) {
  if (!deviceId || !actionUser.value) return
  try {
    actionBusy.value = true
    if (actionMode.value === 'push') {
      const res = await store.pushSingleUserToDevice(deviceId, actionUser.value.zk_userid)
      toast.success(
        `Pushed ${actionUser.value.zk_userid} → device#${deviceId}: ${res?.pushed ? 'created' : 'already exists'}`,
      )
    } else {
      const res = await store.removeUserFromDevice(deviceId, actionUser.value.zk_userid)
      toast.warning(
        `Removed ${actionUser.value.zk_userid} from device#${deviceId}${res?.removed ? '' : ' (check device)'}`,
      )
    }
  } catch (e) {
    toast.error(e?.message || 'Operation failed')
  } finally {
    actionBusy.value = false
    showDeviceAction.value = false
    actionUser.value = null
  }
}

// optional: modal close helper
function closeDeviceAction() {
  showDeviceAction.value = false
  actionUser.value = null
}
</script>

<template>
  <div class="my-container space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">ZK Users</h1>
      <div class="flex items-center gap-2">
        <input
          v-model="search"
          @keyup.enter="doSearch"
          type="text"
          placeholder="Search name / enroll / card"
          class="border rounded px-3 py-1.5 text-sm w-64"
        />
        <button class="btn" @click="doSearch" :disabled="loadingTop">
          <i class="fas fa-search mr-1"></i> Search
        </button>
        <button class="btn-outline" @click="clearSearch" :disabled="loadingTop || !searching">
          <i class="fas fa-times mr-1"></i> Clear
        </button>
        <button class="btn-primary" @click="openCreate">
          <i class="fas fa-user-plus mr-1"></i> New User
        </button>
      </div>
    </div>

    <!-- device scoped actions -->
    <div class="flex flex-wrap items-center gap-2 bg-slate-50 border rounded-lg p-3">
      <div class="text-sm text-slate-600">Device actions:</div>
      <input
        v-model="deviceId"
        type="number"
        min="1"
        placeholder="Device ID"
        class="border rounded px-2 py-1 text-sm w-28"
      />
      <button class="btn" @click="pullFromDevice" :disabled="loadingTop">
        <i class="fas fa-download mr-1"></i> Pull Users
      </button>
      <button class="btn" @click="pushAllToDevice" :disabled="loadingTop">
        <i class="fas fa-upload mr-1"></i> Push All
      </button>
      <button class="btn" @click="countOnDevice" :disabled="loadingTop">
        <i class="fas fa-list-ol mr-1"></i> Count
      </button>

      <span v-if="store.loading || loadingTop" class="ml-auto text-xs text-slate-500">
        <i class="fas fa-circle-notch fa-spin"></i> Working…
      </span>
    </div>

    <!-- table -->
    <UserTable
      :items="users"
      :loading="store.loading"
      @edit="openEdit"
      @delete="askDelete"
      @push-one="openPushOne"
      @remove-one="openRemoveOne"
    />

    <!-- modals -->
    <UserFormModal :show="showForm" :user="editing" @close="closeForm" @save="saveForm" />

    <ConfirmModal
      :show="showConfirm"
      :title="confirmTitle"
      :message="confirmMessage"
      @close="closeConfirm"
      @confirm="runConfirm"
    />

    <DeviceActionModal
      :show="showDeviceAction"
      :mode="actionMode"
      :user="actionUser"
      :devices="devices"
      :loading="actionBusy"
      @close="closeDeviceAction"
      @confirm="onDeviceActionConfirm"
    />
  </div>
</template>

<style scoped>
.my-container {
  @apply max-w-6xl mx-auto p-4;
}
.btn {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50;
}
.btn-outline {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 text-sm text-slate-700 hover:bg-slate-50;
}
.btn-primary {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-white text-sm hover:bg-slate-700;
}
</style>
