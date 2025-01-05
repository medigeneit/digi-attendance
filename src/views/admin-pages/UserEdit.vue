<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useDesignationStore } from '@/stores/designation'
import { useLeaveApprovalStore } from '@/stores/leave-approval'
import { useShiftStore } from '@/stores/shift'
import { useToast } from 'vue-toastification'
import { useRoute, useRouter } from 'vue-router'
import LoaderView from '@/components/common/LoaderView.vue'

const leaveApprovalStore = useLeaveApprovalStore()

const form = reactive({
  name: '',
  phone: '',
  email: '',
  password: '',
  role: 'employee',
  address: '',
  device_user_id: null,
  is_active: true,
  company_id: '',
  department_id: '',
  designation_id: '',
  shift_id: '',
  nid: '',
  date_of_birth: '',
  joining_date: '',
  employment_type: 'Provisional',
  weekends: [],
  leave_approval_id: '',
})

const userStore = useUserStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const designationStore = useDesignationStore()
const shiftStore = useShiftStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const showPassword = ref(false)
const isLoading = ref(false)

onMounted(async () => {
  isLoading.value = true
  await companyStore.fetchCompanies()
  await leaveApprovalStore.fetchLeaveApprovals()
  await loadUser()
  isLoading.value = false
})

watch(
  () => form.company_id,
  async (newCompanyId) => {
    if (newCompanyId) {
      await departmentStore.fetchDepartments(newCompanyId)
      await designationStore.fetchDesignations(newCompanyId)
      await shiftStore.fetchShifts(newCompanyId)
      isLoading.value = false
    }
  },
)

const loadUser = async () => {
  try {
    const userId = route.params.id
    const user = await userStore.fetchUser(userId)

    form.name = user.name
    form.phone = user.phone
    form.email = user.email
    form.address = user.address
    form.nid = user.nid
    form.date_of_birth = user.date_of_birth
    form.joining_date = user.joining_date
    form.employment_type = user.employment_type
    form.weekends = user.weekends || []
    form.is_active = user.is_active
    form.company_id = user.company_id
    form.department_id = user.department_id
    form.designation_id = user.designation_id
    form.shift_id = user.shift_id
    form.role = user.role
    form.device_user_id = user.device_user_id
    form.leave_approval_id = user.leave_approval_id
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to load user data'
    toast.error(errorMessage)
    console.error(errorMessage)
    router.push({ name: 'UserList' })
  }
}

const updateUser = async () => {
  try {
    const dataToSend = { ...form }
    await userStore.updateUser(route.params.id, dataToSend)
    toast.success('User updated successfully')
    router.push({ name: 'UserShow', params: { id: route.params.id } })
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update user'
    toast.error(errorMessage)
    console.error(errorMessage)
  }
}
</script>

<template>
  <div class="my-container space-y-2">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Edit Employee</h2>
      <LoaderView v-if="isLoading" class="bg-gray-100 border shadow-none" />
      <form v-else @submit.prevent="updateUser" class="space-y-4">
        <div class="grid gap-4">
          <div class="border p-4 rounded-md bg-gray-100">
            <p class="title-md">Personal Info</p>
            <hr class="my-2" />
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label>Name</label>
                <input v-model="form.name" type="text" class="w-full p-2 border rounded" required />
              </div>

              <div>
                <label>Phone</label>
                <input
                  v-model="form.phone"
                  type="text"
                  class="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label>Email</label>
                <input v-model="form.email" type="email" class="w-full p-2 border rounded" />
              </div>
              <div>
                <label>Address</label>
                <input v-model="form.address" type="text" class="w-full p-2 border rounded" />
              </div>

              <div>
                <label>NID</label>
                <input v-model="form.nid" type="text" class="w-full p-2 border rounded" />
              </div>

              <div>
                <label>Date of Birth</label>
                <input v-model="form.date_of_birth" type="date" class="w-full p-2 border rounded" />
              </div>
            </div>
          </div>
          <div class="border p-4 rounded-md bg-gray-100">
            <p class="title-md">Professional Info</p>
            <hr class="my-2" />
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label>Company</label>
                <select
                  id="company_id"
                  v-model="form.company_id"
                  class="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="" disabled>Select a company</option>
                  <template v-for="company in companyStore.companies" :key="company?.id">
                    <option :value="company?.id">
                      {{ company?.name }}
                    </option>
                  </template>
                </select>
              </div>

              <div>
                <label>Department</label>
                <select v-model="form.department_id" class="w-full p-2 border rounded">
                  <option value="" disabled>Select a department</option>
                  <option
                    v-for="department in departmentStore.departments"
                    :key="department?.id"
                    :value="department?.id"
                  >
                    {{ department?.name }}
                  </option>
                </select>
              </div>

              <div>
                <label>Designation</label>
                <select v-model="form.designation_id" class="w-full p-2 border rounded">
                  <option value="" disabled>Select a designation</option>
                  <option
                    v-for="designation in designationStore.designations"
                    :key="designation?.id"
                    :value="designation?.id"
                  >
                    {{ designation?.title }}
                  </option>
                </select>
              </div>

              <div>
                <label>Shift</label>
                <select v-model="form.shift_id" class="w-full p-2 border rounded">
                  <option value="" disabled>Select a shift</option>
                  <option v-for="shift in shiftStore.shifts" :key="shift?.id" :value="shift?.id">
                    {{ shift?.name }}
                  </option>
                </select>
              </div>

              <div>
                <label>Employment Type</label>
                <select v-model="form.employment_type" class="w-full p-2 border rounded">
                  <option value="Provisional">Provisional</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Part_Time">Part Time</option>
                  <option value="Remote">Remote</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>

              <div>
                <label>Joining Date</label>
                <input v-model="form.joining_date" type="date" class="w-full p-2 border rounded" />
              </div>

              <div class="">
                <p class="">Select Weekends</p>
                <div class="flex flex-wrap gap-2 md:gap-4 bg-white p-2 border rounded">
                  <label class="flex items-center gap-1.5 md:gap-2">
                    <input
                      type="checkbox"
                      value="Saturday"
                      v-model="form.weekends"
                      class="form-checkbox"
                    />
                    SAT
                  </label>
                  <label class="flex items-center gap-1.5 md:gap-2">
                    <input
                      type="checkbox"
                      value="Sunday"
                      v-model="form.weekends"
                      class="form-checkbox"
                    />
                    SUN
                  </label>
                  <label class="flex items-center gap-1.5 md:gap-2">
                    <input
                      type="checkbox"
                      value="Monday"
                      v-model="form.weekends"
                      class="form-checkbox"
                    />
                    MON
                  </label>
                  <label class="flex items-center gap-1.5 md:gap-2">
                    <input
                      type="checkbox"
                      value="Tuesday"
                      v-model="form.weekends"
                      class="form-checkbox"
                    />
                    TUE
                  </label>
                  <label class="flex items-center gap-1.5 md:gap-2">
                    <input
                      type="checkbox"
                      value="Wednesday"
                      v-model="form.weekends"
                      class="form-checkbox"
                    />
                    WED
                  </label>
                  <label class="flex items-center gap-1.5 md:gap-2">
                    <input
                      type="checkbox"
                      value="Thursday"
                      v-model="form.weekends"
                      class="form-checkbox"
                    />
                    THU
                  </label>
                  <label class="flex items-center gap-1.5 md:gap-2">
                    <input
                      type="checkbox"
                      value="Friday"
                      v-model="form.weekends"
                      class="form-checkbox"
                    />
                    FRI
                  </label>
                </div>
              </div>
              <div>
                <label>Leave Approval Group</label>
                <select v-model="form.leave_approval_id" class="w-full p-2 border rounded">
                  <option value="" disabled>Select Leave Approval Group</option>
                  <template
                    v-for="leaveApproval in leaveApprovalStore.leaveApprovals"
                    :key="leaveApproval.id"
                  >
                    <option :value="leaveApproval.id">{{ leaveApproval.name }}</option>
                  </template>
                </select>
              </div>

              <div>
                <label>Active Status</label>
                <select v-model="form.is_active" class="w-full p-2 border rounded">
                  <option :value="true">Active</option>
                  <option :value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div class="border p-4 rounded-md bg-gray-100">
            <p class="title-md">Technical Info</p>
            <hr class="my-2" />
            <div class="grid md:grid-cols-3 gap-4">
              <div>
                <label>Role</label>
                <select v-model="form.role" class="w-full p-2 border rounded" required>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="developer">Developer</option>
                </select>
              </div>

              <div>
                <label>Biometric Device User ID</label>
                <input
                  v-model="form.device_user_id"
                  type="number"
                  class="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label>Password</label>
                <div class="relative">
                  <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    class="w-full p-2 border rounded"
                  />
                  <span
                    class="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                    @click="showPassword = !showPassword"
                  >
                    <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-4">
          <RouterLink
            :to="{ name: 'UserList' }"
            type="button"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </RouterLink>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
