<script setup>
import { useToast } from 'vue-toastification'
import { ref, onMounted } from 'vue'
import { useZKUserStore } from '@/stores/zk-user'
import { useDeviceStore } from '@/stores/zk-device'
import ZKUserModal from '@/components/ZKUserModal.vue'
import ZKUserPushModal from '@/components/ZKUserPushModal.vue'
import ZKUserPullModal from '@/components/ZKUserPullModal.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'

const toast = useToast()

const zkUserStore = useZKUserStore()
const deviceStore = useDeviceStore()
const selectedIds = ref([])
const showModal = ref(false)
const editUserData = ref(null)

const showDeleteModal = ref(false)
const deleteUserId = ref(null)

// ⬇️ নতুন: Push modal state
const showPushModal = ref(false)
const pushUserData = ref(null)

const showPullModal = ref(false)
const pullUserData = ref(null)

onMounted(() => {
  zkUserStore.fetchUsers()
  deviceStore.fetchDevices()
})

function openCreateModal() {
  editUserData.value = null
  showModal.value = true
}
function openEditModal(user) {
  editUserData.value = { ...user }
  showModal.value = true
}
function closeModal() {
  showModal.value = false
}
function handleSaved() {
  zkUserStore.fetchUsers()
  closeModal()
}

// 🔻 delete
function confirmDelete(userId) {
  deleteUserId.value = userId
  showDeleteModal.value = true
}
async function performDelete() {
  await zkUserStore.deleteUser(deleteUserId.value)
  deleteUserId.value = null
  showDeleteModal.value = false
  zkUserStore.fetchUsers()
}

// ✅ নতুন: open/close push modal
function openPushModal(user) {
  pushUserData.value = { ...user }
  showPushModal.value = true
}

function handlePushed(summary) {
  // চাইলে এখানে summary থেকে টোস্ট/লগ করতে পারো
  // console.log('push summary', summary)
}

// ✅ নতুন: Pull modal open/close
function openPullModal(user) {
  pullUserData.value = { ...user }
  showPullModal.value = true
}
function handlePulled(summary) {
  // summary: { fingers_pulled, fingers:[], user_present, device_id }
  toast.success(
    `✅ Pulled ${summary?.fingers_pulled ?? 0} template(s) from device ${summary?.device_id ?? ''}`,
  )
}

function toggleSelectAll(event) {
  if (event.target.checked) {
    selectedIds.value = zkUserStore.users.map((u) => u.id)
  } else {
    selectedIds.value = []
  }
}

const roleMap = { 0: 'User', 14: 'Admin' }
</script>

<template>
  <div class="my-container space-y-4">
    <HeaderWithButtons title="ZK User Management" @add="openCreateModal" />

    <LoaderView v-if="zkUserStore.loading" />

    <div v-else class="overflow-x-auto card-bg">
      <table class="min-w-full text-sm text-left text-gray-700">
        <thead class="bg-gray-200 uppercase text-xs text-gray-600 tracking-wider">
          <tr>
            <th class="p-3"><input type="checkbox" @change="toggleSelectAll($event)" /></th>

            <th class="p-3">Device User ID</th>
            <th class="p-3">Name (Device)</th>
            <th class="p-3">Fingers</th>
            <th class="p-3">Role</th>
            <th class="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in zkUserStore.users"
            :key="user.id"
            class="border-b hover:bg-gray-50 transition-colors duration-150"
          >
            <td class="p-3"><input type="checkbox" :value="user.id" v-model="selectedIds" /></td>

            <td class="p-3">{{ user.zk_userid }}</td>
            <td class="p-3 font-medium">{{ user.name }}</td>
            <td class="p-3">{{ user.fingerprints_count }}</td>
            <td class="p-3">{{ roleMap[user.role] ?? '—' }}</td>
            <td class="p-3 space-x-6">
              <button
                @click="openEditModal(user)"
                class="text-blue-600 hover:text-blue-800 font-semibold"
                title="Edit user"
              >
                <i class="fas fa-edit"></i>
              </button>

              <!-- ✅ নতুন: Push FP button -->
              <button
                @click="openPushModal(user)"
                class="text-purple-600 hover:text-purple-800 font-semibold"
                title="Push user's fingerprints to selected devices"
              >
                <i class="fas fa-upload"></i>
              </button>

              <button
                @click="openPullModal(user)"
                class="text-green-600 hover:text-green-800 font-semibold"
                title="Pull user's fingerprints from a selected device"
              >
                <i class="fas fa-fingerprint"></i>
              </button>

              <button
                @click="confirmDelete(user.id)"
                class="text-red-600 hover:text-red-800 font-semibold"
                title="Delete user"
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <ZKUserModal
    :show="showModal"
    :editUser="editUserData"
    @close="closeModal"
    @saved="handleSaved"
  />

  <DeleteModal
    :show="showDeleteModal"
    title="Confirm Deletion"
    message="Are you sure you want to delete this user?"
    @close="showDeleteModal = false"
    @confirm="performDelete"
  />

  <!-- ✅ নতুন: Push FP modal -->
  <ZKUserPushModal
    :show="showPushModal"
    :user="pushUserData"
    :devices="deviceStore.devices"
    @close="showPushModal = false"
    @pushed="handlePushed"
  />

  <ZKUserPullModal
    :show="showPullModal"
    :user="pullUserData"
    :devices="deviceStore.devices"
    @close="showPullModal = false"
    @pulled="handlePulled"
  />
</template>
