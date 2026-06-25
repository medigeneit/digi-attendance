<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  unit: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const isEditMode = ref(false)
const unitForm = reactive({
  id: null,
  name: '',
  short_name: '',
  project_code: '',
  project_name: '',
  status: 'Active',
})

const resetForm = () => {
  isEditMode.value = false
  unitForm.id = null
  unitForm.name = ''
  unitForm.short_name = ''
  unitForm.project_code = ''
  unitForm.project_name = ''
  unitForm.status = 'Active'
}

watch(
  () => props.unit,
  (newUnit) => {
    if (newUnit && typeof newUnit === 'object' && Object.keys(newUnit).length > 0) {
      isEditMode.value = true
      unitForm.id = newUnit.id || null
      unitForm.name = newUnit.name || ''
      unitForm.short_name = newUnit.short_name || ''
      unitForm.project_code = newUnit.project_code || ''
      unitForm.project_name = newUnit.project_name || ''
      unitForm.status = newUnit.status || 'Active'
    } else {
      resetForm()
    }
  },
  { immediate: true, deep: true },
)

const closeModal = () => {
  emit('close')
}

const handleSubmit = () => {
  emit('save', { ...unitForm })
  closeModal()
}
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-lg font-semibold mb-4">
        {{ isEditMode ? 'Edit Unit' : 'Add Unit' }}
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="unit_short_name" class="block text-sm font-medium mb-2">Unit Code</label>
          <input
            id="unit_short_name"
            v-model="unitForm.short_name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter unit code"
            required
          />
        </div>
        <div class="mb-4">
          <label for="unit_name" class="block text-sm font-medium mb-2">Unit Name</label>
          <input
            id="unit_name"
            v-model="unitForm.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter unit name"
            required
          />
        </div>
        <div class="mb-4">
          <label for="unit_project_code" class="block text-sm font-medium mb-2">Project Code</label>
          <input
            id="unit_project_code"
            v-model="unitForm.project_code"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter project code"
            required
          />
        </div>
        <div class="mb-4">
          <label for="unit_project_name" class="block text-sm font-medium mb-2">Project Name</label>
          <input
            id="unit_project_name"
            v-model="unitForm.project_name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter project name"
            required
          />
        </div>
        <div class="mb-4">
          <label for="unit_status" class="block text-sm font-medium mb-2">Status</label>
          <select
            id="unit_status"
            v-model="unitForm.status"
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
