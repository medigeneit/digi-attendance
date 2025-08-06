<script setup>
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  department: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const companyStore = useCompanyStore()
const userStore = useUserStore()

const { companies, employees } = storeToRefs(companyStore)
const { users } = storeToRefs(userStore)

const selectIncharge = ref('')
const selectCoordinator = ref('')
const isEditMode = ref(false)
const isCompaniesFetched = ref(false) // Track if companies are fetched
const departmentForm = reactive({
  id: null,
  company_id: '',
  incharge_id: '',
  coordinator_id: '',
  name: '',
  short_name: '',
  description: '',
  status: 'Active',
})

const computedInchargeId = computed(() => (selectIncharge.value ? selectIncharge.value.id : null))
const computedCoordinatorId = computed(() =>
  selectCoordinator.value ? selectCoordinator.value.id : null,
)

watch(computedInchargeId, (newVal) => {
  departmentForm.incharge_id = newVal
})

watch(computedCoordinatorId, (newVal) => {
  departmentForm.coordinator_id = newVal
})

const resetForm = () => {
  isEditMode.value = false
  departmentForm.id = null
  departmentForm.company_id = ''
  departmentForm.incharge_id = ''
  departmentForm.coordinator_id = ''
  departmentForm.name = ''
  departmentForm.short_name = ''
  departmentForm.description = ''
  departmentForm.status = 'Active'
}

watch(
  () => props.department,
  (newDepartment) => {
    if (
      newDepartment &&
      typeof newDepartment === 'object' &&
      Object.keys(newDepartment).length > 0
    ) {
      isEditMode.value = true
      departmentForm.id = newDepartment.id || null
      departmentForm.company_id = newDepartment.company_id || ''
      departmentForm.incharge_id = newDepartment.in_charge?.id || ''
      departmentForm.coordinator_id = newDepartment.coordinator?.id || ''
      departmentForm.name = newDepartment.name || ''
      departmentForm.short_name = newDepartment.short_name || ''
      departmentForm.description = newDepartment.description || ''
      departmentForm.status = newDepartment.status || 'Active'
    } else {
      resetForm()
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => props.show,
  async (isShown) => {
    if (isShown && !isCompaniesFetched.value) {
      await fetchCompanies() // Fetch companies when the modal is shown
    }
  },
)

watch(
  () => departmentForm.company_id,
  async (company_id) => {
    if (company_id) {
      await fetchEmployee(company_id)
    }
  },
)

const handleSubmit = () => {
  emit('save', { ...departmentForm })
  resetForm()
  closeModal()
}

const closeModal = () => {
  resetForm() // Reset the form when the modal is closed
  emit('close')
}

const fetchCompanies = async () => {
  try {
    await companyStore.fetchCompanies()
    isCompaniesFetched.value = true
  } catch (error) {
    console.error('Failed to fetch companies:', error)
  }
}

const fetchEmployee = async (companyId) => {
  if (!companyId) return

  await companyStore.fetchEmployee(companyId)

  selectIncharge.value = companyStore.employees.find(
    (employee) => employee.id === props.department?.in_charge?.id,
  )
}

onMounted(async () => {
  console.log(`DepartmentModal: onMounted`)

  await fetchCompanies()

  if (props.department.company_id) {
    await fetchEmployee(props.department.company_id)
  }

  await userStore.fetchTypeWiseEmployees({ type: 'academy_body,doctor' })

  selectCoordinator.value = userStore.users?.find(
    (user) => user.id === props.department?.coordinator?.id,
  )
})
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-lg font-semibold mb-4">
        {{ isEditMode ? 'Edit Department' : 'Add Department' }}
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="company_id" class="block text-sm font-medium mb-2">Company</label>
          <select
            id="company_id"
            v-model="departmentForm.company_id"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="" disabled>Select a company</option>
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label for="incharge_id" class="block text-sm font-medium mb-2">In-Charge</label>
          <Multiselect
            :options="employees"
            v-model="selectIncharge"
            label="label"
            :multiple="false"
          />
        </div>

        <div class="mb-4">
          <label for="coordinator_id" class="block text-sm font-medium mb-2">Coordinator</label>
          <Multiselect
            :options="users"
            v-model="selectCoordinator"
            label="label"
            :multiple="false"
          />
        </div>

        <div class="mb-4">
          <label for="name" class="block text-sm font-medium mb-2">Name</label>
          <input
            id="name"
            v-model="departmentForm.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter department name"
            required
          />
        </div>
        <div class="mb-4">
          <label for="short_name" class="block text-sm font-medium mb-2">Short Name</label>
          <input
            id="short_name"
            v-model="departmentForm.short_name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter short name"
          />
        </div>
        <div class="mb-4">
          <label for="description" class="block text-sm font-medium mb-2">Description</label>
          <textarea
            id="description"
            v-model="departmentForm.description"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter description"
          ></textarea>
        </div>
        <div class="mb-4">
          <label for="status" class="block text-sm font-medium mb-2">Status</label>
          <select
            id="status"
            v-model="departmentForm.status"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            @click="closeModal"
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
          >
            Cancel
          </button>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">
            {{ isEditMode ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
