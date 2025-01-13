<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  holiday: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const isEditMode = ref(false)
const holidayForm = reactive({
  id: null,
  year: new Date().getFullYear(), // Default to current year
  name: '',
  start_date: '',
  end_date: '',
  type: 'government',
  description: '',
})

const resetForm = () => {
  isEditMode.value = false
  holidayForm.id = null
  holidayForm.year = new Date().getFullYear()
  holidayForm.name = ''
  holidayForm.start_date = ''
  holidayForm.end_date = ''
  holidayForm.type = 'government'
  holidayForm.description = ''
}

watch(
  () => props.holiday,
  (newHoliday) => {
    if (newHoliday) {
      isEditMode.value = true
      Object.assign(holidayForm, newHoliday)
    } else {
      resetForm()
    }
  },
  { immediate: true, deep: true },
)

const handleSubmit = () => {
  emit('save', { ...holidayForm })
  closeModal()
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-lg font-semibold mb-4">
        {{ isEditMode ? 'Edit Holiday' : 'Add Holiday' }}
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="year" class="block text-sm font-medium mb-2">Year</label>
          <input
            id="year"
            v-model="holidayForm.year"
            type="number"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter year"
            required
          />
        </div>
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium mb-2">Name</label>
          <input
            id="name"
            v-model="holidayForm.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter holiday name"
            required
          />
        </div>
        <div class="mb-4">
          <label for="start_date" class="block text-sm font-medium mb-2">Start Date</label>
          <input
            id="start_date"
            v-model="holidayForm.start_date"
            type="date"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div class="mb-4">
          <label for="end_date" class="block text-sm font-medium mb-2">End Date</label>
          <input
            id="end_date"
            v-model="holidayForm.end_date"
            type="date"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div class="mb-4">
          <label for="type" class="block text-sm font-medium mb-2">Type</label>
          <select
            id="type"
            v-model="holidayForm.type"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="government">Government</option>
            <option value="special">Special</option>
            <option value="organizational">Organizational</option>
          </select>
        </div>
        <div class="mb-4">
          <label for="description" class="block text-sm font-medium mb-2">Description</label>
          <textarea
            id="description"
            v-model="holidayForm.description"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter holiday description (optional)"
          ></textarea>
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
