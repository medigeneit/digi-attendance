<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShiftAssignmentModal from '@/components/common/ShiftAssignmentModal.vue'
import ShiftWeekendModal from '@/components/common/WeekendAssignModal.vue'
import CriteriaAssignModal from '@/components/CriteriaAssignModal.vue'
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
const selectedCompany = ref(route.query.company || 'all')
const selectedDepartment = ref(route.query.department || 'all')
const selectedLineType = ref(route.query.line_type || 'all')
const selectedStatus = ref(route.query.status || 'active')
const selectedUserId = ref('')
const selectedEmployee = ref('')
const shiftAssignmentModal = ref(false)
const modalOpen = ref(false)
const departmentStore = useDepartmentStore()
const companyStore = useCompanyStore()
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)
const users = ref([])

onMounted(async () => {
  await companyStore.fetchCompanies()

  const companyId = route.query.company
  const departmentId = route.query.department

  if (companyId) {
    await fetchEmployees(companyId)
    await fetchDepartmentByCompany(companyId)
  }

  if (departmentId) {
    await fetchDepartmentEmployee(departmentId)
  }
})

const goBack = () => {
  router.go(-1)
}

const fetchUser = () => {
  userStore.fetchUsers({
    company_id: route.query.company,
    department_id: route.query.department,
    line_type: route.query.line_type,
    status: route.query.status,
    user_id: route.query.employee_id,
  })
}

watch(selectedCompany, async (newVal, oldVal) => {
  if (!newVal || newVal === oldVal) return
  fetchDepartmentByCompany(newVal)
  fetchEmployees(newVal)
  if (route.query.company !== newVal) {
    router.push({
      query: {
        ...route.query,
        company: newVal,
      },
    })
  }
})

watch(selectedDepartment, async (newVal, oldVal) => {
  if (!newVal || newVal === oldVal) return
  fetchDepartmentEmployee(newVal)
  if (route.query.department !== newVal) {
    router.push({
      query: {
        ...route.query,
        department: newVal,
      },
    })
  }
})

watch(selectedLineType, (newVal) => {
  router.push({
    query: {
      ...route.query,
      line_type: newVal,
    },
  })
})

watch(selectedStatus, (newVal) => {
  router.push({
    query: {
      ...route.query,
      status: newVal,
    },
  })
})

const fetchDepartmentByCompany = async (company_id) => {
  await departmentStore.fetchDepartments(company_id)
}

const groupedUsers = computed(() => {
  let filteredUsers = [...(userStore?.users || [])]
  // 1. Filter by Selected Company
  if (selectedCompany.value !== 'all') {
    filteredUsers = filteredUsers.filter((user) => user?.company?.id == selectedCompany.value)
  }

  // 2. Filter by Selected Department
  if (selectedDepartment.value !== 'all') {
    filteredUsers = filteredUsers.filter((user) => user?.department?.id == selectedDepartment.value)
  }

  // 3. Filter by Line Type
  if (selectedLineType.value !== 'all') {
    filteredUsers = filteredUsers.filter((user) => user?.type == selectedLineType.value)
  }

  // 3. Filter by Active/Inactive
  if (selectedStatus.value) {
    const is_active = selectedStatus.value === 'active' ? 1 : 0
    filteredUsers = filteredUsers.filter((user) => user?.is_active == is_active)
  }

  // // 4. Filter by Selected User
  // if (selectedUser.value?.id) {
  //   filteredUsers = filteredUsers.filter((user) => user?.id == selectedUser.value.id)
  // }

  // // 4. Filter by Selected User
  if (selectedUserId.value) {
    filteredUsers = filteredUsers.filter((user) => user?.id == selectedUserId.value)
  }

  // Group Users by Company Name
  const grouped = {}
  filteredUsers.forEach((user) => {
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
function toggleWeekendModal(user) {
  modalEmployeeId.value = user.id
  selectedEmployee.value = user
  if (user?.company_id === undefined) {
    return
  }
  shiftStore.fetchShifts(user?.company_id)
  modalOpen.value = !modalOpen.value
}

function modalClose() {
  shiftAssignmentModal.value = false
}

async function excelDownload() {
  await userStore.fetchUsersExcelExport({
    data: {
      company_id: selectedCompany.value,
      department_id: selectedDepartment.value,
      line_type: selectedLineType.value,
      status: selectedStatus.value,
    },
  })
}

const fetchEmployees = async (companyId) => {
  try {
    const res = await companyStore.fetchEmployees(companyId)
    users.value = res.data
  } catch (err) {
    console.error('Failed to fetch employees by company:', err)
  }
}

const fetchDepartmentEmployee = async (departmentId) => {
  try {
    const res = await departmentStore.fetchDepartmentEmployee({
      departmentIds: [departmentId],
    })
    users.value = res
  } catch (err) {
    console.error('Failed to fetch employees by department:', err)
  }
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

const assignOpen = ref(false)
const selectedUser = ref()

function openAssign(user) {
  selectedUser.value = user
  assignOpen.value = true
}

function afterAssigned() {
  assignOpen.value = false
  // চাইলে এখানে রিফ্রেশ কল করতে পারেন
}

// const selectedCompanyId = ref()
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Employee List</h1>

      <div class="flex gap-4">
        <RouterLink
          :to="{ name: 'UserAdd', query: { company: route.query.company } }"
          class="btn-2"
        >
          <span class="hidden md:flex">Add New</span>
          <i class="far fa-plus"></i>
        </RouterLink>
        <button type="button" @click="excelDownload" class="btn-3">
          <i class="far fa-file-excel text-2xl text-green-500"></i>Excel
        </button>
      </div>
    </div>

    <div class="flex gap-4 items-center py-2">
      <EmployeeFilter
        v-model:company_id="selectedCompany"
        v-model:department_id="selectedDepartment"
        v-model:employee_id="selectedUserId"
        v-model:line_type="selectedLineType"
        :with-type="true"
        :initial-value="$route.query"
        class="w-full"
      />
      <select v-model="selectedStatus" class="input-1 w-auto">
        <option value="active">Active</option>
        <option value="in_active">In Active</option>
      </select>
      <div class="btn-2" @click="fetchUser()">Search</div>
    </div>

    <div v-if="userStore.isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div
        v-if="Object.keys(groupedUsers).length === 0"
        class="text-center py-2 text-lg italic text-gray-500"
      >
        User not found
      </div>

      <div v-for="(users, companyName) in groupedUsers" :key="companyName">
        <h2 class="title-md">{{ companyName }} ({{ users.length }})</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-200 text-sm font-medium text-gray-700">
                <th class="border border-gray-300 px-2 text-left">#</th>
                <th class="border border-gray-300 px-2 text-left">Name</th>
                <th class="border border-gray-300 px-2 text-left">Designation</th>
                <th class="border border-gray-300 px-2 text-left">Finger ID</th>
                <th class="border border-gray-300 px-2 text-left">Employee ID</th>
                <th class="border border-gray-300 px-2 text-left">Joining Date</th>
                <th class="border border-gray-300 px-2 text-left">Role</th>
                <th class="border border-gray-300 px-2 text-left">Shift</th>
                <th class="border border-gray-300 px-2 text-left">Weekend</th>
                <th class="border border-gray-300 px-2 text-left">Phone</th>
                <th class="border border-gray-300 px-2 text-left">Email</th>
                <th class="border border-gray-300 px-2 text-left">Status</th>
                <th class="border border-gray-300 px-2 text-left">KPI Criteria</th>
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
                <td class="border border-gray-300 px-2">{{ user?.device_user_id }}</td>
                <td class="border border-gray-300 px-2">{{ user?.employee_id }}</td>
                <td class="border border-gray-300 px-2">{{ user.joining_date }}</td>
                <td class="border border-gray-300 px-2">{{ user.role }}</td>
                <td class="border border-gray-300 px-3 py-3">
                  <div class="flex items-center justify-between gap-2">
                    <!-- Shift Info -->
                    <div>
                      <span
                        v-if="user.current_shift?.shift?.name"
                        class="text-sm font-medium text-green-700"
                      >
                        {{ user.current_shift.shift.name }}
                      </span>
                      <span v-else class="text-sm italic text-red-500">Not Assigned</span>
                    </div>

                    <!-- Action Button -->
                    <button
                      @click="toggleModal(user)"
                      :title="user?.current_shift ? 'Change Shift' : 'Assign Shift'"
                      class="p-2 rounded-full transition hover:scale-110 focus:outline-none"
                      :class="
                        user?.current_shift
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-emerald-600 text-white'
                      "
                    >
                      <i :class="user?.current_shift ? 'fas fa-pen' : 'fas fa-plus'"></i>
                    </button>
                  </div>

                  <Transition name="fade">
                    <ShiftAssignmentModal
                      v-if="modalEmployeeId === user.id && shiftAssignmentModal"
                      :isOpen="shiftAssignmentModal"
                      :shifts="shifts"
                      :hasShift="user?.current_shift"
                      :employee="{ id: selectedEmployee.id, name: selectedEmployee.name }"
                      @close="modalClose"
                    />
                  </Transition>
                </td>
                <td class="border border-gray-300 px-3 py-3">
                  <div class="flex items-center justify-between gap-2">
                    <!-- Weekend Info -->
                    <div>
                      <span
                        v-if="user?.assign_weekend?.weekends?.length"
                        class="text-sm font-medium text-green-700"
                      >
                        {{ user.assign_weekend.weekends.join(', ') }}
                      </span>
                      <span v-else class="text-sm italic text-red-500">Not Assigned</span>
                    </div>

                    <!-- Action Button -->
                    <button
                      @click="toggleWeekendModal(user)"
                      :title="
                        user?.assign_weekend?.weekends?.length ? 'Edit Weekend' : 'Assign Weekend'
                      "
                      class="p-2 rounded-full transition hover:scale-110 focus:outline-none"
                      :class="
                        user?.assign_weekend?.weekends?.length
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-emerald-600 text-white'
                      "
                    >
                      <i
                        :class="
                          user?.assign_weekend?.weekends?.length ? 'fas fa-pen' : 'fas fa-plus'
                        "
                      ></i>
                    </button>
                  </div>

                  <Transition name="fade">
                    <ShiftWeekendModal
                      v-if="modalEmployeeId === user.id && modalOpen"
                      :isOpen="modalOpen"
                      :assign_weekend="user.assign_weekend"
                      :userId="user.id"
                      @close="modalOpen = false"
                    />
                  </Transition>
                </td>

                <td class="border border-gray-300 px-2">{{ user.phone }}</td>
                <td class="border border-gray-300 px-2">{{ user.email || 'নেই' }}</td>
                <td class="border border-gray-300 px-2">
                  <span v-if="user.is_active" class="text-green-500">Active</span>
                  <span v-else class="text-red-500">Inactive</span>
                </td>
                <td class="px-2 py-1 whitespace-nowrap">
                  <button
                    @click="openAssign(user)"
                    :title="(user.criteria_assignments?.length || 0) > 0 ? 'Manage KPI criteria' : 'Assign KPI criteria'"
                    :class="[
                      'group inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition',
                      'focus:outline-none focus:ring-2 focus:ring-offset-1',
                      (user.criteria_assignments?.length || 0) > 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white focus:ring-slate-300'
                    ]"
                  >
                    <span class="ml-1 hidden lg:inline">
                      {{ (user.criteria_assignments?.length || 0) > 0 ? 'Manage' : 'Assign' }}
                    </span>

                    <span
                      class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                      :class="(user.criteria_assignments?.length || 0) > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'"
                    >
                      {{ user.criteria_assignments?.length || 0 }}
                    </span>
                  </button>
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


      <CriteriaAssignModal
        v-model="assignOpen"
        :user-id="selectedUser?.id"
        :user-label="selectedUser?.name"
        :criteria_assignments="selectedUser?.criteria_assignments"
        @assigned="afterAssigned"
      />

    </div>
  </div>
</template>
