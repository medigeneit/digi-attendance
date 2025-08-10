<script setup>
import { ref, onMounted } from 'vue'
import { useZKUserStore } from '@/stores/zk-user'
import { useDeviceStore } from '@/stores/zk-device'
import ZKUserModal from '@/components/ZKUserModal.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'

const zkUserStore = useZKUserStore()
const deviceStore = useDeviceStore()
const selectedIds = ref([])
const showModal = ref(false)
const editUserData = ref(null)

const showDeleteModal = ref(false) // ✅ delete modal control
const deleteUserId = ref(null) // ✅ holds user ID to delete

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

// ✅ show confirmation modal
function confirmDelete(userId) {
  deleteUserId.value = userId
  showDeleteModal.value = true
}

// ✅ called when Confirm clicked
async function performDelete() {
  await zkUserStore.deleteUser(deleteUserId.value)
  deleteUserId.value = null
  showDeleteModal.value = false
  zkUserStore.fetchUsers()
}

function toggleSelectAll(event) {
  if (event.target.checked) {
    selectedIds.value = zkUserStore.users.map((u) => u.id)
  } else {
    selectedIds.value = []
  }
}
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
            <th class="p-3">ID</th>
            <th class="p-3">Device User ID</th>
            <th class="p-3">Name (Software)</th>
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
            <td class="p-3">{{ user.zk_uid }}</td>
            <td class="p-3">{{ user.zk_userid }}</td>
            <td class="p-3 font-medium">{{ user?.user?.name }}</td>
            <td class="p-3 font-medium">{{ user.name }}</td>
            <td class="p-3">{{ user.fingerprints_count }}</td>
            <td class="p-3 space-x-6">
              <button
                @click="openEditModal(user)"
                class="text-blue-600 hover:text-blue-800 font-semibold"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                @click="confirmDelete(user.id)"
                class="text-red-600 hover:text-red-800 font-semibold"
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
</template>
