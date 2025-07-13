<script setup>
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { storeToRefs } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  department: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const companyStore = useCompanyStore()

const { companies, employees } = storeToRefs(companyStore)

const selectIncharge = ref('')
const isEditMode = ref(false)
const isCompaniesFetched = ref(false) // Track if companies are fetched
const departmentForm = reactive({
  id: null,
  company_id: '',
  incharge_id: '',
  name: '',
  short_name: '',
  description: '',
  status: 'Active',
})

const computedInchargeId = computed(() => (selectIncharge.value ? selectIncharge.value.id : null))

// Watcher দিয়ে `computedInchargeId` কে `departmentForm.incharge_id`-এ আপডেট করা হচ্ছে
watch(computedInchargeId, (newVal) => {
  departmentForm.incharge_id = newVal
})

const resetForm = () => {
  isEditMode.value = false
  departmentForm.id = null
  departmentForm.company_id = ''
  departmentForm.incharge_id = ''
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
      await companyStore.fetchEmployee(company_id)

      selectIncharge.value = companyStore.employees.find(
        (employee) => employee.id === props.department?.in_charge?.id,
      )
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
          <label for="incharge_id" class="block text-sm font-medium mb-2">In Chare</label>
          <Multiselect
            :options="employees"
            v-model="selectIncharge"
            label="label"
            :multiple="false"
          />
          <!-- <select
            id="incharge_id"
            v-model="departmentForm.incharge_id"
            class="w-full border rounded px-3 py-2" >
            <option value="" disabled>Select Employee</option>
            <option v-for="(employee, index) in employees" :key="index" :value="index">
              {{ employee }}
            </option>
          </select> -->
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
