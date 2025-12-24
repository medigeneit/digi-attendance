<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShiftWeekendModal from '@/components/common/WeekendAssignModal.vue'

import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useDesignationStore } from '@/stores/designation'
import { useLeaveApprovalStore } from '@/stores/leave-approval'
import { useShiftStore } from '@/stores/shift'
import { useUserStore } from '@/stores/user'

import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

/* ----------------------------- STORES & SETUP ----------------------------- */
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const designationStore = useDesignationStore()
const leaveApprovalStore = useLeaveApprovalStore()
const shiftStore = useShiftStore()
const userStore = useUserStore()

const { designations } = storeToRefs(designationStore)
const { shifts } = storeToRefs(shiftStore)
const { error } = storeToRefs(userStore)

const route = useRoute()
const router = useRouter()
const toast = useToast()

/* ------------------------------ UI STATE --------------------------------- */
const isPageLoading = ref(true)
const isDepsLoading = ref(false)
const isSubmitting = ref(false)
const showPassword = ref(false)
const modalOpen = ref(false)

const BLOOD_GROUPS = Object.freeze(['A+','A-','B+','B-','AB+','AB-','O+','O-'])
const EMPLOYMENT_TYPES = Object.freeze([
  'Probationary', 'Permanent', 'Part_Time', 'Remote', 'Contract', 'Freelance', 'Intern'
])

/* -------------------------------- FORM ----------------------------------- */
const form = reactive({
  name: '',
  bn_name: '',
  phone: '',
  email: '',
  password: '',
  role: 'employee',
  type: '',
  address: '',
  note: '',
  device_user_id: null,
  is_active: true,
  company_id: '',
  department_id: '',
  designation_id: '',
  shift_id: '',
  nid: '',
  date_of_birth: '',
  joining_date: '',
  employment_type: 'Probationary',
  contract_month: 0,
  provisional_month: 0,
  extended_provisional_month: 0,
  employee_id: '',
  weekends: [],
  leave_approval_id: '',
  other_approval_id: '',
  blood: '',
})

// Weekend picker payload (kept separate to avoid polluting core form)
const selectedWeekend = ref({ weekends: [], start_month: '', end_month: '' })
const handleShiftUpdate = (data) => { selectedWeekend.value = data }

/* ------------------------------ COMPUTEDS -------------------------------- */
const currentCompany = computed(() => companyStore.companies.find(c => c.id === form.company_id))

// Support both id-keyed and name-keyed maps (defensive until store normalized)
const computedDesignations = computed(() => {
  if (!currentCompany.value) return []
  const m = designations.value || {}
  return m[currentCompany.value.id] || m[currentCompany.value.name] || []
})

const computedShifts = computed(() => {
  if (!currentCompany.value) return []
  const m = shifts.value || {}
  return m[currentCompany.value.id] || m[currentCompany.value.name] || []
})

/* ------------------------------ VALIDATION ------------------------------- */
const errors = reactive({})

function validate() {
  // reset
  for (const k of Object.keys(errors)) delete errors[k]

  const required = {
    name: 'Name is required',
    phone: 'Phone is required',
    company_id: 'Company is required',
    department_id: 'Department is required',
    role: 'Role is required',
  }

  for (const [key, msg] of Object.entries(required)) {
    if (!String(form[key] ?? '').trim()) errors[key] = msg
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Provide a valid email address'
  }

  if (form.employment_type === 'Contract' && (!form.contract_month || form.contract_month < 0)) {
    errors.contract_month = 'Contract month must be ≥ 0'
  }

  return Object.keys(errors).length === 0
}

/* --------------------------------- LOAD ---------------------------------- */
async function loadUser() {
  const id = route.params.id
  const user = await userStore.fetchUser(id)

  if (!user) throw new Error('User not found')

  // Weekend selection
  if (user.assign_weekend) {
    selectedWeekend.value = {
      weekends: user.assign_weekend.weekends || [],
      start_month: user.assign_weekend.start_month
        ? dayjs(user.assign_weekend.start_month).format('YYYY-MM')
        : '',
      end_month: user.assign_weekend.end_month
        ? dayjs(user.assign_weekend.end_month).format('YYYY-MM')
        : '',
    }
  } else {
    selectedWeekend.value = { weekends: [], start_month: '', end_month: '' }
  }

  // Core fields
  form.name = user.name || ''
  form.bn_name = user.bn_name || ''
  form.phone = user.phone || ''
  form.email = user.email || ''
  form.address = user.address || ''
  form.nid = user.nid || ''
  form.date_of_birth = user.date_of_birth || ''
  form.blood = user.blood || ''
  form.joining_date = user.joining_date || ''
  form.employment_type = user.employment_type || 'Probationary'
  form.employee_id = user.employee_id || ''
  form.provisional_month = user.provisional_month ?? 0
  form.extended_provisional_month = user.extended_provisional_month ?? 0
  form.contract_month = user.contract_month ?? 0
  form.weekends = user.weekends || []
  form.is_active = Boolean(user.is_active)
  form.company_id = user.company_id || ''
  form.department_id = user.department_id || ''
  form.designation_id = user.designation_id || ''
  form.shift_id = user.shift_id || ''
  form.role = user.role || 'employee'
  form.type = user.type || ''
  form.device_user_id = user.device_user_id ?? ''
  form.leave_approval_id = user.leave_approval_id || ''
  form.other_approval_id = user.other_approval_id || ''
}

/* ----------------------------- LIFECYCLE --------------------------------- */

onMounted(async () => {
  try {
    isPageLoading.value = true
    // Prime dropdowns in parallel
    await Promise.all([
      companyStore.fetchCompanies(),
      leaveApprovalStore.fetchLeaveApprovals(),
    ])
    await loadUser()
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || 'Failed to load user data'
    toast.error(msg)
    router.push({ name: 'UserList' })
  } finally {
    isPageLoading.value = false
  }
})

watch(
  () => form.company_id,
  async (newId) => {
    if (!newId) return
    try {
      isDepsLoading.value = true
      await Promise.all([
        departmentStore.fetchDepartments(newId),
        designationStore.fetchDesignations(newId),
        shiftStore.fetchShifts(newId),
      ])
    } finally {
      isDepsLoading.value = false
    }
  },
)

/* ---------------------------- ACTIONS ------------------------------------ */
async function updateUser() {
  if (!validate()) {
    toast.error('Please fix the highlighted fields')
    return
  }

  try {
    isSubmitting.value = true
    const payload = {
      ...form,
      selected_weekend: {
        weekends: selectedWeekend.value.weekends,
        start_month: selectedWeekend.value.start_month || null,
        end_month: selectedWeekend.value.end_month || null,
      },
    }

    await userStore.updateUser(route.params.id, payload)

    if (!error.value) {
      toast.success('User updated successfully')
      router.push({ name: 'UserShow', params: { id: route.params.id } })
    } else {
      toast.error(error.value)
    }
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || 'Failed to update user'
    toast.error(msg)
  } finally {
    isSubmitting.value = false
  }
}

function clearWeekend() {
  selectedWeekend.value = { weekends: [], start_month: '', end_month: '' }
}
</script>

<template>
  <div class="my-container">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Edit Employee</h2>

      <!-- <LoaderView v-if="isPageLoading" class="bg-gray-100 border shadow-none" /> -->

      <form class="space-y-6" @submit.prevent="updateUser" novalidate>
        <!-- Personal Info -->
        <fieldset class="border p-4 rounded-md bg-gray-50">
          <legend class="title-md px-2">Personal Info</legend>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="name">Name<span class="text-red-500">*</span></label>
              <input
                id="name"
                v-model.trim="form.name"
                type="text"
                class="w-full p-2 border rounded"
                :aria-invalid="!!errors.name"
                autocomplete="name"
                required
              />
              <p v-if="errors.name" class="text-red-600 text-sm mt-1">{{ errors.name }}</p>
            </div>

            <div>
              <label for="bnName">Bangla Name</label>
              <input
                id="bnName"
                v-model.trim="form.bn_name"
                type="text"
                class="w-full p-2 border rounded"
                autocomplete="name"
              />
            </div>

            <div>
              <label for="phone">Phone<span class="text-red-500">*</span></label>
              <input
                id="phone"
                v-model.trim="form.phone"
                type="tel"
                inputmode="tel"
                class="w-full p-2 border rounded"
                :aria-invalid="!!errors.phone"
                autocomplete="tel"
                required
              />
              <p v-if="errors.phone" class="text-red-600 text-sm mt-1">{{ errors.phone }}</p>
            </div>

            <div>
              <label for="email">Email</label>
              <input
                id="email"
                v-model.trim.lazy="form.email"
                type="email"
                class="w-full p-2 border rounded"
                :aria-invalid="!!errors.email"
                autocomplete="email"
                placeholder="name@example.com"
              />
              <p v-if="errors.email" class="text-red-600 text-sm mt-1">{{ errors.email }}</p>
            </div>

            <div>
              <label for="address">Address</label>
              <input
                id="address"
                v-model.trim="form.address"
                type="text"
                class="w-full p-2 border rounded"
                autocomplete="street-address"
                placeholder="House / Street / Area"
              />
            </div>

            <div>
              <label for="nid">NID</label>
              <input id="nid" v-model.trim="form.nid" type="text" class="w-full p-2 border rounded" />
            </div>

            <div>
              <label for="dob">Date of Birth</label>
              <input id="dob" v-model="form.date_of_birth" type="date" class="w-full p-2 border rounded" />
            </div>

            <div>
              <label for="bloodGroup" class="text-gray-700 flex items-center gap-2">Blood Group</label>
              <select id="bloodGroup" v-model="form.blood" class="py-2 px-4 border rounded w-full">
                <option disabled value="">Select blood group</option>
                <option v-for="g in BLOOD_GROUPS" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
          </div>
        </fieldset>

        <!-- Professional Info -->
        <fieldset class="border p-4 rounded-md bg-gray-50">
          <legend class="title-md px-2">Professional Info</legend>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="company">Company<span class="text-red-500">*</span></label>
              <select
                id="company"
                v-model="form.company_id"
                class="w-full border rounded px-3 py-2"
                :aria-invalid="!!errors.company_id"
                required
              >
                <option value="" disabled>Select a company</option>
                <option v-for="c in companyStore.companies" :key="c?.id" :value="c?.id">{{ c?.name }}</option>
              </select>
              <p v-if="errors.company_id" class="text-red-600 text-sm mt-1">{{ errors.company_id }}</p>
            </div>

            <div>
              <label for="department">Department<span class="text-red-500">*</span></label>
              <select
                id="department"
                v-model="form.department_id"
                class="w-full p-2 border rounded"
                :disabled="isDepsLoading || !form.company_id"
                :aria-invalid="!!errors.department_id"
                required
              >
                <option value="" disabled>
                  {{ isDepsLoading ? 'Loading departments…' : 'Select a department' }}
                </option>
                <option v-for="d in departmentStore.departments" :key="d?.id" :value="d?.id">{{ d?.name }}</option>
              </select>
              <p v-if="errors.department_id" class="text-red-600 text-sm mt-1">{{ errors.department_id }}</p>
            </div>

            <div>
              <label for="designation">Designation</label>
              <select
                id="designation"
                v-model="form.designation_id"
                class="w-full p-2 border rounded"
                :disabled="isDepsLoading || !form.company_id"
              >
                <option value="" disabled>
                  {{ isDepsLoading ? 'Loading designations…' : 'Select a designation' }}
                </option>
                <option v-for="dg in computedDesignations" :key="dg?.id" :value="dg?.id">{{ dg?.title }}</option>
              </select>
            </div>

            <div>
              <label for="joining">Joining Date</label>
              <input id="joining" v-model="form.joining_date" type="date" class="w-full p-2 border rounded" />
            </div>

            <div>
              <label for="lineType">Line Type</label>
              <select id="lineType" v-model="form.type" class="w-full p-2 border rounded" required>
                <option value="" disabled>Select Line Type</option>
                <option value="executive">Executive</option>
                <option value="support_staff">Support Staff</option>
                <option value="doctor">Doctor</option>
                <option value="academy_body">Academy Body</option>
              </select>
            </div>

            <div>
              <label for="empType">Employment Type</label>
              <select id="empType" v-model="form.employment_type" class="w-full p-2 border rounded">
                <option v-for="t in EMPLOYMENT_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>

            <template v-if="form.employment_type === 'Probationary'">
              <div>
                <label for="probMonth">Probationary Period (month)</label>
                <input id="probMonth" v-model.number="form.provisional_month" type="number" min="0" placeholder="3" class="w-full p-2 border rounded" />
              </div>
              <div>
                <label for="probExt">Extended Probationary (month)</label>
                <input id="probExt" v-model.number="form.extended_provisional_month" type="number" min="0" placeholder="3" class="w-full p-2 border rounded" />
              </div>
            </template>

            <template v-if="form.employment_type === 'Contract'">
              <div>
                <label for="contractMonth">Contract (month)</label>
                <input
                  id="contractMonth"
                  v-model.number="form.contract_month"
                  type="number"
                  min="0"
                  max="120"
                  placeholder="6"
                  class="w-full p-2 border rounded"
                  :aria-invalid="!!errors.contract_month"
                  required
                />
                <p v-if="errors.contract_month" class="text-red-600 text-sm mt-1">{{ errors.contract_month }}</p>
              </div>
            </template>

            <div class="md:col-span-2">
              <div class="flex items-center gap-3 flex-wrap">
                <button type="button" class="btn-2" @click="modalOpen = true">Select Weekends</button>
                <button type="button" class="btn-ghost border px-3 py-2 rounded" @click="clearWeekend">Clear</button>
              </div>
              <div v-if="selectedWeekend" class="flex flex-wrap gap-4 bg-white p-3 border rounded mt-2 text-sm">
                <p><strong>Weekends:</strong> {{ selectedWeekend.weekends.join(', ') || '—' }}</p>
                <p><strong>Start Month:</strong> {{ selectedWeekend.start_month || '—' }}</p>
                <p><strong>End Month:</strong> {{ selectedWeekend.end_month || '—' }}</p>
              </div>
              <ShiftWeekendModal :isOpen="modalOpen" :assign_weekend="selectedWeekend" @close="modalOpen = false" @update="handleShiftUpdate" />
            </div>

            <div>
              <label>Leave Approval Group</label> 
              <select v-model="form.leave_approval_id" class="w-full p-2 border rounded"> 
                <option value="" disabled>Select Leave Approval Group</option> 
                <template v-for="leaveApproval in leaveApprovalStore.leaveApprovals" :key="leaveApproval.id" > 
                  <option v-if="leaveApproval.type === 'leave'" :value="leaveApproval.id"> {{ leaveApproval.name }} </option> 
                </template> 
              </select>
            </div>

            <div>
             <label>Other Approval Group</label> 
              <select v-model="form.other_approval_id" class="w-full p-2 border rounded"> 
                <option value="" disabled>Select Other Approval Group</option> 
                <template v-for="leaveApproval in leaveApprovalStore.leaveApprovals" :key="leaveApproval.id" > 
                  <option v-if="leaveApproval.type === 'other'" :value="leaveApproval.id"> {{ leaveApproval.name }} </option> 
                </template> 
              </select>
            </div>

            <div>
              <label for="active">Active Status</label>
              <select id="active" v-model="form.is_active" class="w-full p-2 border rounded">
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
            </div>

            <div class="md:col-span-2" v-if="!form.is_active">
              <label for="inactiveNote">Inactive Note</label>
              <input id="inactiveNote" v-model.trim="form.note" type="text" class="w-full p-2 border rounded" placeholder="Reason / context…" :required="!form.is_active" />
            </div>
          </div>
        </fieldset>

        <!-- Technical Info -->
        <fieldset class="border p-4 rounded-md bg-gray-50">
          <legend class="title-md px-2">Technical Info</legend>
          <div class="grid md:grid-cols-4 gap-4">
            <div>
              <label for="role">Role<span class="text-red-500">*</span></label>
              <select id="role" v-model="form.role" class="w-full p-2 border rounded" :aria-invalid="!!errors.role" required>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="developer">Developer</option>
              </select>
              <p v-if="errors.role" class="text-red-600 text-sm mt-1">{{ errors.role }}</p>
            </div>

            <div>
              <label for="deviceId">Device User ID</label>
              <input id="deviceId" v-model.number="form.device_user_id" type="number" inputmode="numeric" placeholder="3456" class="w-full p-2 border rounded" />
            </div>

            <div>
              <label for="empId">Employee ID</label>
              <input id="empId" v-model.trim="form.employee_id" type="text" class="w-full p-2 border rounded" placeholder="M123456" autocomplete="off" />
            </div>

            <div>
              <label for="password">Password</label>
              <div class="relative">
                <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" class="w-full p-2 border rounded pr-10" autocomplete="new-password" />
                <button type="button" class="absolute inset-y-0 right-2 px-1 text-gray-600" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Hide password' : 'Show password'">
                  <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- Footer Actions (sticky) -->
        <div class="sticky bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t p-3 mt-6 flex justify-center gap-3">
          <RouterLink
            :to="{ name: 'UserList', query: { company: route.query.company } }"
            class="px-4 py-2 rounded border hover:bg-gray-50"
          >
            Cancel
          </RouterLink>
          <button
            type="submit"
            class="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            :disabled="isSubmitting"
          >
            <span v-if="!isSubmitting">Save</span>
            <span v-else class="inline-flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Saving…
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
