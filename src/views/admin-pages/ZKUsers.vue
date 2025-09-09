<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useZKUserStore } from '@/stores/zk-user.js'
import { useDeviceStore } from '@/stores/zk-device.js'
import { useZktecoStore } from '@/stores/zkteco.js' // ✅ নতুন

import UserTable from '@/components/UserTable.vue'
import UserFormModal from '@/components/UserFormModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import DeviceActionModal from '@/components/DeviceActionModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import DeviceActionsBar from '@/components/DeviceActionsBar.vue'

const deviceStore = useDeviceStore()
const devices = computed(() => deviceStore.devices)

const store = useZKUserStore()
const zkStore = useZktecoStore() // ✅

const toast = useToast()

const showDeviceAction = ref(false)
const actionMode = ref('push') // 'push' | 'remove'
const actionUser = ref(null)

const actionBusyRemove = ref(false)
const actionBusyPush = ref(false) // ✅ single loader for push

const showForm = ref(false)
const editing = ref(null)
const showConfirm = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')

let confirmAction = null
let confirmPayload = null

const users = computed(() => store.users)
const loadUsers = () => store.fetchUsers()

onMounted(async () => {
  await Promise.all([store.fetchUsers(), deviceStore.fetchDevices()])
})

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
  confirmMessage.value = `Are you sure you want to delete "${u.name}" (Enroll ${u.userid})?`
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

// row-level actions → device modal
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

// ✅ one handler for both: remove OR push (user+fp)
async function onDeviceActionConfirm(deviceId) {
  if (!deviceId || !actionUser.value) return
  try {
    if (actionMode.value === 'remove') {
      actionBusyRemove.value = true
      const res = await store.removeUserFromDevice(deviceId, actionUser.value.userid)
      toast.warning(
        `Removed ${actionUser.value.userid} from device#${deviceId}${res?.removed ? '' : ' (check device)'}`,
      )
    } else {
      actionBusyPush.value = true
      // useZktecoStore → push both (user + fingerprints)
      const res = await zkStore.push({
        deviceId,
        what: 'both',
        scope: 'only',
        userIds: [actionUser.value.id], // central user id
        disableDuringSync: true,
      })
      const up = Number(res?.users_pushed ?? 0)
      const fp = Number(res?.fingers_pushed ?? 0)
      toast.success(`Pushed to device #${deviceId}: users ${up}, fingerprints ${fp}`)
    }
  } catch (e) {
    toast.error(e?.error || e?.message || 'Operation failed')
  } finally {
    actionBusyRemove.value = false
    actionBusyPush.value = false
    showDeviceAction.value = false
    actionUser.value = null
  }
}
</script>

<template>
  <div class="my-container space-y-4">
    <HeaderWithButtons title="ZK Users" @add="openCreate" />

    <DeviceActionsBar :devices="devices" />

    <UserTable
      :items="users"
      :loading="store.loading"
      @edit="openEdit"
      @delete="askDelete"
      @push-one="openPushOne"
      @remove-one="openRemoveOne"
    />

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
      :loading="actionBusyRemove"
      :loading-push="actionBusyPush"
      @close="
        () => {
          showDeviceAction = false
          actionUser = null
        }
      "
      @confirm="onDeviceActionConfirm"
    />
  </div>
</template>

<style scoped>
.my-container {
  @apply max-w-6xl mx-auto p-4;
}
</style>
