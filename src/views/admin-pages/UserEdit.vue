<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useDesignationStore } from '@/stores/designation'
import { useShiftStore } from '@/stores/shift'
import { useToast } from 'vue-toastification'
import LoaderView from '@/components/common/LoaderView.vue'

const form = reactive({
  name: '',
  phone: '',
  email: '',
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
})

const showPassword = ref(false)
const isLoading = ref(false)

const userStore = useUserStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const designationStore = useDesignationStore()
const shiftStore = useShiftStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const fetchOptions = async () => {
  try {
    isLoading.value = true
    await Promise.all([
      companyStore.fetchCompanies(),
      departmentStore.fetchDepartments(),
      designationStore.fetchDesignations(),
      shiftStore.fetchShifts(),
    ])
  } catch (error) {
    toast.error('Failed to load options')
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

const companies = companyStore.companies
const departments = departmentStore.departments
const designations = designationStore.designations
const shifts = shiftStore.shifts

const fetchUser = async () => {
  try {
    isLoading.value = true
    const userId = route.params.id
    const user = await userStore.fetchUser(userId)
    Object.assign(form, user)
  } catch (error) {
    toast.error('Failed to load user details')
    console.error(error)
    router.push({ name: 'UserList' })
  } finally {
    isLoading.value = false
  }
}

const updateUser = async () => {
  try {
    const dataToSend = {
      name: form.name,
      phone: form.phone,
      email: form.email,
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
    }

    const userId = route.params.id
    await userStore.updateUser(userId, dataToSend)
    toast.success('User updated successfully')
    router.push({ name: 'UserList' })
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update user'
    toast.error(errorMessage)
    console.error(errorMessage)
  }
}

onMounted(async () => {
  await fetchOptions()
  await fetchUser()
})
</script>

<template>
  <div class="my-container space-y-2">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Edit Employee</h2>
      <LoaderView v-if="isLoading" class="shadow-none" />
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
                  <option v-for="company in companies" :key="company?.id" :value="company?.id">
                    {{ company?.name }}
                  </option>
                </select>
              </div>

              <div>
                <label>Department</label>
                <select v-model="form.department_id" class="w-full p-2 border rounded">
                  <option value="" disabled>Select a department</option>
                  <option
                    v-for="department in departments"
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
                    v-for="designation in designations"
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
                  <option v-for="shift in shifts" :key="shift?.id" :value="shift?.id">
                    {{ shift?.name }}
                  </option>
                </select>
              </div>

              <div>
                <label>Employment Type</label>
                <select v-model="form.employment_type" class="w-full p-2 border rounded">
                  <option value="Provisional">Provisional</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Parttime">Parttime</option>
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
            Update
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
