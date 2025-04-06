<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShiftAssignmentModal from '@/components/common/ShiftAssignmentModal.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useShiftStore } from '@/stores/shift'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const shiftStore = useShiftStore()
const { shifts } = storeToRefs(shiftStore)
const router = useRouter()
const userStore = useUserStore()
const companyNames = ref([])
const selectedCompany = ref('all')
const selectedUser = ref('')
const selectedEmployee = ref('')
const shiftAssignmentModal = ref(false)

onMounted(() => {
  userStore.fetchUsers()
})

const goBack = () => {
  router.go(-1)
}

const groupedUsers = computed(() => {
  const grouped = {}
  const uniqueNames = new Set()

  userStore.users.forEach((user) => {
    const companyName = user.company?.name || 'Unknown Company'

    if (!grouped[companyName]) {
      grouped[companyName] = []
    }
    grouped[companyName].push(user)

    uniqueNames.add(companyName)
  })

  companyNames.value = Array.from(uniqueNames)

  let filteredGrouped = grouped

  // Filter by company
  if (selectedCompany.value !== 'all') {
    filteredGrouped = {
      [selectedCompany.value]: grouped[selectedCompany.value] || [],
    }
  }

  // Filter by selectedUser (assumes user object with id)
  if (selectedUser.value?.id) {
    const filtered = {}

    for (const [company, users] of Object.entries(filteredGrouped)) {
      const matchedUsers = users.filter((u) => u.id === selectedUser.value.id)
      if (matchedUsers.length) {
        filtered[company] = matchedUsers
      }
    }

    return filtered
  }

  return filteredGrouped
})

const modalEmployeeId = ref('')

function toggleModal(user) {
  modalEmployeeId.value = user.id
  selectedEmployee.value = user
  if (user?.company_id === undefined) {
    return
  }
  shiftStore.fetchShifts(user?.company_id)
  shiftAssignmentModal.value = !shiftAssignmentModal.value
}

function modalClose() {
  shiftAssignmentModal.value = false
}
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Employee List</h1>
      <RouterLink :to="{ name: 'UserAdd' }" class="btn-2">
        <span class="hidden md:flex">Add New</span>
        <i class="far fa-plus"></i>
      </RouterLink>
    </div>
    <div class="flex items-center justify-start gap-2">
      <select v-model="selectedCompany" class="input-1">
        <option value="all" selected>All Company</option>
        <option v-for="(item, index) in companyNames" :key="index">{{ item }}</option>
      </select>
      <MultiselectDropdown
        v-model="selectedUser"
        :options="userStore.users"
        :multiple="false"
        class="w-full"
        placeholder="Select Employee"
      />
    </div>

    <div v-if="userStore.isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-for="(users, companyName) in groupedUsers" :key="companyName">
        <h2 class="title-md">{{ companyName }}</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-200">
                <th class="border border-gray-300 px-2 text-left">#</th>
                <th class="border border-gray-300 px-2 text-left">Name</th>
                <th class="border border-gray-300 px-2 text-left">Designation</th>
                <th class="border border-gray-300 px-2 text-left">Role</th>
                <th class="border border-gray-300 px-2 text-left">Shift</th>
                <th class="border border-gray-300 px-2 text-left">Phone</th>
                <th class="border border-gray-300 px-2 text-left">Email</th>
                <th class="border border-gray-300 px-2 text-left">Status</th>
                <th class="border border-gray-300 px-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(user, index) in users"
                :key="user.id"
                class="border-b border-gray-200 hover:bg-blue-200"
              >
                <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
                <td class="border border-gray-300 px-2">{{ user?.name }}</td>
                <td class="border border-gray-300 px-2">{{ user.designation?.title }}</td>
                <td class="border border-gray-300 px-2">{{ user.role }}</td>
                <td class="border border-gray-300 px-2">
                  <button
                    type="button"
                    @click="toggleModal(user)"
                    class="btn-4 text-sm"
                    :class="
                      user?.assign_shift
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'btn-4'
                    "
                  >
                    {{ user?.assign_shift ? 'Change Shift' : 'Assign Shift' }}
                  </button>
                  <div v-if="modalEmployeeId === user.id && shiftAssignmentModal">
                    <ShiftAssignmentModal
                      :isOpen="shiftAssignmentModal"
                      :shifts="shifts"
                      :hasShift="user?.assign_shift"
                      :employee="{ id: selectedEmployee.id, name: selectedEmployee.name }"
                      @close="modalClose"
                    />
                  </div>
                </td>
                <td class="border border-gray-300 px-2">{{ user.phone }}</td>
                <td class="border border-gray-300 px-2">{{ user.email || 'নেই' }}</td>
                <td class="border border-gray-300 px-2">
                  <span v-if="user.is_active" class="text-green-500">Active</span>
                  <span v-else class="text-red-500">Inactive</span>
                </td>
                <td class="border border-gray-300 px-2">
                  <div class="flex gap-2">
                    <RouterLink
                      :to="{ name: 'UserShow', params: { id: user.id } }"
                      class="btn-icon"
                    >
                      <i class="far fa-eye"></i>
                    </RouterLink>
                    <RouterLink
                      :to="{ name: 'UserEdit', params: { id: user.id } }"
                      class="btn-icon"
                    >
                      <i class="far fa-edit"></i>
                    </RouterLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
