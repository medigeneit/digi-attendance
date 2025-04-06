<script setup>
import { useShiftStore } from '@/stores/shift'
import dayjs from 'dayjs'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

const emit = defineEmits(['close'])

const props = defineProps({
  isOpen: Boolean,
  shifts: {
    type: Object,
    default: () => ({}),
  },
  employee: {
    type: Object,
    default: () => ({ id: 0, name: '' }),
  },
  hasShift: {
    type: Object,
    default: () => null,
  },
})

const form = ref({
  shift_id: '',
  employee_id: props.employee.id,
  start_date: '',
  end_date: '',
})

const shiftArray = computed(() => {
  const firstKey = Object.keys(props.shifts)[0]
  return props.shifts[firstKey] || []
})

watch(
  () => props.employee,
  (newVal) => {
    form.value.employee_id = newVal?.id || 0
  },
  { immediate: true, deep: true },
)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.hasShift) {
        form.value.shift_id = props.hasShift.shift_id || ''
        form.value.start_date = props.hasShift.start_date
          ? dayjs(props.hasShift.start_date).format('YYYY-MM-DD')
          : ''
        form.value.end_date = props.hasShift.end_date
          ? dayjs(props.hasShift.end_date).format('YYYY-MM-DD')
          : ''
        form.value.employee_id = props.employee?.id || ''
      } else {
        form.value.shift_id = ''
        form.value.start_date = ''
        form.value.end_date = ''
      }
    }
  },
  { immediate: true },
)

const closeModal = () => {
  emit('close', false)
}

const shiftStore = useShiftStore()

const { message } = storeToRefs(shiftStore)

const handleAction = async () => {
  if (!form.value.shift_id || !form.value.start_date || !form.value.employee_id) {
    alert('All fields are required!')
    return
  }
  try {
    const payload = {
      ...form.value,
    }
    const response = await shiftStore.shiftAssign(payload)
    console.log('Shift assigned successfully:', response)

    alert(props.hasShift ? 'Shift updated successfully!' : 'Shift assigned successfully!')
    closeModal()
  } catch (err) {
    console.error('Failed to assign shift:', err)
    alert('Failed to assign shift.')
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="flex items-center justify-center fixed top-0 left-0 w-full h-full z-50 bg-opacity-40"
  >
    <div class="modal-card relative bg-white p-6 rounded w-full max-w-md">
      <h2 class="text-lg font-semibold mb-4">
        {{ props.hasShift ? 'Update Shift for' : 'Assign Shift to' }} {{ employee.name }}
      </h2>
      {{ message }}
      <div class="mb-4">
        <label class="block text-sm mb-1">Select Shift:</label>
        <select v-model="form.shift_id" class="w-full p-2 border rounded">
          <option value="" disabled>Select a shift</option>
          <option v-for="shift in shiftArray" :key="shift?.id" :value="shift?.id">
            {{ shift?.name }}
          </option>
        </select>
      </div>

      <div class="mb-4">
        <label class="block text-sm mb-1">Start Date:</label>
        <input type="date" v-model="form.start_date" class="w-full border rounded p-2" />
      </div>

      <div class="mb-4">
        <label class="block text-sm mb-1">End Date (optional):</label>
        <input type="date" v-model="form.end_date" class="w-full border rounded p-2" />
      </div>

      <div class="flex justify-end gap-3 mt-4">
        <button @click="closeModal" class="px-4 py-2 bg-gray-400 text-white rounded">Cancel</button>
        <button @click="handleAction" class="px-4 py-2 bg-green-600 text-white rounded">
          {{ props.hasShift ? 'Update' : 'Assign' }}
        </button>
      </div>

      <button type="button" @click="closeModal" class="absolute top-2 right-2 text-red-500 text-xl">
        <i class="far fa-times-circle"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.modal-card {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}
</style>
