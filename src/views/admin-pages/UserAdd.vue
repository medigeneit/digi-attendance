<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/user'
import { useShiftStore } from '@/stores/shift'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useDesignationStore } from '@/stores/designation'
import { useLeaveApprovalStore } from '@/stores/leave-approval'

const toast = useToast()
const userStore = useUserStore()
const shiftStore = useShiftStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const designationStore = useDesignationStore()
const leaveApprovalStore = useLeaveApprovalStore()

const showPassword = ref(false)

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

onMounted(async () => {
  await companyStore.fetchCompanies()
  await leaveApprovalStore.fetchLeaveApprovals()
})

watch(
  () => form.company_id,
  async (newCompanyId) => {
    if (newCompanyId) {
      await departmentStore.fetchDepartments(newCompanyId)
      await designationStore.fetchDesignations(newCompanyId)
      await shiftStore.fetchShifts(newCompanyId)

      form.department_id = ''
      form.designation_id = ''
      form.shift_id = ''
    }
  },
)

const saveUser = async () => {
  try {
    const dataToSend = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      password: form.password,
      role: form.role,
      address: form.address,
      device_user_id: form.device_user_id,
      is_active: form.is_active,
      company_id: form.company_id,
      department_id: form.department_id,
      designation_id: form.designation_id,
      shift_id: form.shift_id,
      nid: form.nid,
      date_of_birth: form.date_of_birth,
      joining_date: form.joining_date,
      employment_type: form.employment_type,
      weekends: form.weekends,
      leave_approval_id: form.leave_approval_id,
    }

    await userStore.createUser(dataToSend)
    toast.success('User created successfully')
    await userStore.fetchUsers()
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to save user'
    toast.error(errorMessage)
    console.error(errorMessage)
  }
}
</script>

<template>
  <div class="my-container space-y-2">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Add Employee</h2>
      <form @submit.prevent="saveUser" class="space-y-4">
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
                    required
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
