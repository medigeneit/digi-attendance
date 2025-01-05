<script setup>
import { ref, watch, reactive } from 'vue'
import { useCompanyStore } from '@/stores/company' // Import the company store

const props = defineProps({
  show: { type: Boolean, required: true },
  shift: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const companyStore = useCompanyStore()

const companies = companyStore.companies

const isEditMode = ref(false)
const isCompaniesFetched = ref(false) // Track if companies are fetched
const shiftForm = reactive({
  id: null,
  company_id: '',
  name: '',
  start_time: '',
  end_time: '',
  description: '',
  status: 'Active',
})

const resetForm = () => {
  isEditMode.value = false
  shiftForm.id = null
  shiftForm.company_id = ''
  shiftForm.name = ''
  shiftForm.start_time = ''
  shiftForm.end_time = ''
  shiftForm.description = ''
  shiftForm.status = 'Active'
}

watch(
  () => props.shift,
  (newShift) => {
    if (newShift && typeof newShift === 'object' && Object.keys(newShift).length > 0) {
      isEditMode.value = true
      shiftForm.id = newShift.id || null
      shiftForm.company_id = newShift.company_id || ''
      shiftForm.name = newShift.name || ''
      shiftForm.start_time = newShift.start_time || ''
      shiftForm.end_time = newShift.end_time || ''
      shiftForm.description = newShift.description || ''
      shiftForm.status = newShift.status || 'Active'
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

const handleSubmit = () => {
  emit('save', { ...shiftForm }) // Emit the shift form data to the parent
  resetForm() // Reset the form after submission
  closeModal()
}

const closeModal = () => {
  resetForm() // Reset the form when the modal is closed
  emit('close')
}

const fetchCompanies = async () => {
  try {
    await companyStore.fetchCompanies()
    isCompaniesFetched.value = true // Mark companies as fetched
  } catch (error) {
    console.error('Failed to fetch companies:', error)
  }
}
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-lg font-semibold mb-4">
        {{ isEditMode ? 'Edit Shift' : 'Add Shift' }}
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="company_id" class="block text-sm font-medium mb-2">Company</label>
          <select
            id="company_id"
            v-model="shiftForm.company_id"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="" disabled>Select a company</option>
            <option v-for="company in companyStore.companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label for="name" class="block text-sm font-medium mb-2">Name</label>
          <input
            id="name"
            v-model="shiftForm.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter shift name"
            required
          />
        </div>

        <div class="mb-4">
          <label for="start_time" class="block text-sm font-medium mb-2">Start Time</label>
          <input
            id="start_time"
            v-model="shiftForm.start_time"
            type="time"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div class="mb-4">
          <label for="end_time" class="block text-sm font-medium mb-2">End Time</label>
          <input
            id="end_time"
            v-model="shiftForm.end_time"
            type="time"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div class="mb-4">
          <label for="description" class="block text-sm font-medium mb-2">Description</label>
          <textarea
            id="description"
            v-model="shiftForm.description"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter description (optional)"
          ></textarea>
        </div>

        <div class="mb-4">
          <label for="status" class="block text-sm font-medium mb-2">Status</label>
          <select
            id="status"
            v-model="shiftForm.status"
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
