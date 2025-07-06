<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShiftAssignmentModal from '@/components/common/ShiftAssignmentModal.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import UserChip from '@/components/user/UserChip.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useShiftStore } from '@/stores/shift'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const shiftStore = useShiftStore()
const { shifts } = storeToRefs(shiftStore)
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const companyNames = ref([])
const selectedCompany = ref(route.query.company || 'all')
const selectedDepartment = ref(route.query.department || 'all')
const selectedLineType = ref(route.query.line_type || 'all')
const selectedUser = ref('')
const selectedEmployee = ref('')
const shiftAssignmentModal = ref(false)
const departmentStore = useDepartmentStore()
const companyStore = useCompanyStore()
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)


onMounted(() => {
  userStore.fetchUsers()
  companyStore.fetchCompanies()
  onCompanyChange(selectedCompany.value)
})

const goBack = () => {
  router.go(-1)
}

watch(selectedCompany, (newVal) => {
  onCompanyChange(newVal)
  router.push({
    query: {
      ...route.query,
      company:newVal,
    },
  })
})

watch(selectedDepartment, (newVal) => {
  router.push({
    query: {
      ...route.query,
      department:newVal,
    },
  })
})

watch(selectedLineType, (newVal) => {
  router.push({
    query: {
      ...route.query,
      line_type:newVal,
    },
  })
})

const onCompanyChange = async (company_id) => {
  await departmentStore.fetchDepartments(company_id)
}

const groupedUsers = computed(() => {
  let filteredUsers = [...userStore?.users || []]
  // 1. Filter by Selected Company
  if (selectedCompany.value !== 'all') {
    filteredUsers = filteredUsers.filter(user => user?.company?.id == selectedCompany.value)
  }

  // 2. Filter by Selected Department
  if (selectedDepartment.value !== 'all') {
    filteredUsers = filteredUsers.filter(user => user?.department?.id == selectedDepartment.value)
  }

  // 3. Filter by Line Type
  if (selectedLineType.value !== 'all') {
    filteredUsers = filteredUsers.filter(user => user?.type == selectedLineType.value)
  }

  // 4. Filter by Selected User
  if (selectedUser.value?.id) {
    filteredUsers = filteredUsers.filter(user => user?.id == selectedUser.value.id)
  }

  // Group Users by Company Name
  const grouped = {}
  filteredUsers.forEach(user => {
    const companyName = user?.company?.name || 'Unknown Company'
    if (!grouped[companyName]) {
      grouped[companyName] = []
    }
    grouped[companyName].push(user)
  })

  return grouped
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

async function excelDownload() {
  await userStore.fetchUsersExcelExport({
    data: {
      companyName: selectedCompany.value,
    },
  })
}

const formattedName = (name) => {
  if (name) {
    const nameParts = name.split(' ')
    const firstTwoWords = nameParts.slice(0, 2).join(' ')
    const remainingWords = nameParts.length > 2 ? `<br>${nameParts.slice(2).join(' ')}` : ''
    return firstTwoWords + remainingWords
  }
  return ''
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
      <RouterLink :to="{ name: 'UserAdd', query: { company: route.query.company } }" class="btn-2">
        <span class="hidden md:flex">Add New</span>
        <i class="far fa-plus"></i>
      </RouterLink>
    </div>
    <div class="flex items-center gap-4">
      <div>
        <select v-model="selectedCompany" class="input-1">
          <option value="all" selected>All Company</option>
          <option v-for="(item, index) in companies" :key="index" :value="item.id" >{{ item?.name }}</option>
        </select>
      </div>
      <div>
        <select v-model="selectedDepartment" class="input-1">
          <option value="all" selected>All Department</option>
          <option v-for="(item, index) in departments" :key="index" :value="item.id" >{{ item?.name }}</option>
        </select>
      </div>
      <div>
        <select v-model="selectedLineType" class="input-1">
          <option value="all">All Category</option>
          <option value="executive">Executive</option>
          <option value="support_staff">Support Staff</option>
          <option value="doctor">Doctor</option>
          <option value="academy_body">Academy Body</option>
        </select>
      </div>
      <!-- {{ userStore.users }} -->
      <MultiselectDropdown
        v-model="selectedUser"
        :options="userStore.users"
        :multiple="false"
        label="name"
        label-prefix="employee_id"
        class="w-1/3"
        placeholder="Select user"
      >
        <template #option="{ option }">
          <UserChip :user="option" class="w-full line-clamp-1" />
        </template>
      </MultiselectDropdown>
      <button type="button" @click="excelDownload" class="btn-3">
        <i class="far fa-file-excel text-2xl text-green-500"></i>Excel
      </button>
    </div>

    <div v-if="userStore.isLoading" class="text-center py-4">
      <LoaderView />
    </div>
    

    <div v-else class="space-y-4">
      <div v-for="(users, companyName) in groupedUsers" :key="companyName">
        <h2 class="title-md">{{ companyName }} ({{ users.length }})</h2>
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
                <td class="border border-gray-300 px-2" v-html="formattedName(user?.name)"></td>
                <td
                  class="border border-gray-300 px-2"
                  v-html="formattedName(user?.designation?.title)"
                ></td>
                <!-- <td class="border border-gray-300 px-2">{{ user.designation?.title }}</td> -->
                <td class="border border-gray-300 px-2">{{ user.role }}</td>
                <td class="border border-gray-300 px-2">
                  <button
                    type="button"
                    @click="toggleModal(user)"
                    class="btn-4 text-sm"
                    :class="user?.current_shift ? 'bg-yellow-500 hover:bg-yellow-600' : 'btn-4'"
                  >
                    {{ user?.current_shift ? 'Change Shift' : 'Assign Shift' }}
                  </button>
                  <div v-if="modalEmployeeId === user.id && shiftAssignmentModal">
                    <ShiftAssignmentModal
                      :isOpen="shiftAssignmentModal"
                      :shifts="shifts"
                      :hasShift="user?.current_shift"
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
                      :to="{
                        name: 'UserShow',
                        params: { id: user.id },
                        query: { company: route.query.company },
                      }"
                      class="btn-icon"
                    >
                      <i class="far fa-eye"></i>
                    </RouterLink>
                    <RouterLink
                      :to="{
                        name: 'UserEdit',
                        params: { id: user.id },
                        query: { company: route.query.company },
                      }"
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
