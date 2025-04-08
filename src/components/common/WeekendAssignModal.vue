<script setup>
import dayjs from 'dayjs'
import { ref, watch } from 'vue'

const emit = defineEmits(['close', 'update'])
const props = defineProps({
  isOpen: Boolean,
  assign_weekend: {
    type: Object,
    default: () => null,
  },
})

const form = ref({
  weekends: [],
  start_month: new Date().toISOString().substring(0, 7),
  end_month: '',
})

// Watch modal open state to initialize form
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.assign_weekend) {
        form.value.weekends = props.assign_weekend.weekends || []
        form.value.start_month = props.assign_weekend.start_month
          ? dayjs(props.assign_weekend.start_month).format('YYYY-MM')
          : new Date().toISOString().substring(0, 7)
        form.value.end_month = props.assign_weekend.end_month
          ? dayjs(props.assign_weekend.end_month).format('YYYY-MM')
          : ''
      } else {
        form.value.weekends = []
        form.value.start_month = new Date().toISOString().substring(0, 7)
        form.value.end_month = ''
      }
    }
  },
  { immediate: true },
)

// Emit update when form changes
watch(
  form,
  (newVal) => {
    emit('update', { ...newVal })
  },
  { deep: true },
)

const closeModal = () => {
  emit('close', false)
}
</script>

<template>
  <div
    v-if="isOpen"
    class="flex items-center justify-center fixed top-0 left-0 w-full h-full z-50 bg-opacity-40 bg-black"
  >
    <div class="modal-card relative bg-white p-6 rounded w-full max-w-xl">
      <div class="flex flex-wrap gap-2 md:gap-4 bg-white p-2 border rounded">
        <label class="flex items-center gap-1.5 md:gap-2">
          <input type="checkbox" value="Saturday" v-model="form.weekends" class="form-checkbox" />
          SAT
        </label>
        <label class="flex items-center gap-1.5 md:gap-2">
          <input type="checkbox" value="Sunday" v-model="form.weekends" class="form-checkbox" />
          SUN
        </label>
        <label class="flex items-center gap-1.5 md:gap-2">
          <input type="checkbox" value="Monday" v-model="form.weekends" class="form-checkbox" />
          MON
        </label>
        <label class="flex items-center gap-1.5 md:gap-2">
          <input type="checkbox" value="Tuesday" v-model="form.weekends" class="form-checkbox" />
          TUE
        </label>
        <label class="flex items-center gap-1.5 md:gap-2">
          <input type="checkbox" value="Wednesday" v-model="form.weekends" class="form-checkbox" />
          WED
        </label>
        <label class="flex items-center gap-1.5 md:gap-2">
          <input type="checkbox" value="Thursday" v-model="form.weekends" class="form-checkbox" />
          THU
        </label>
        <label class="flex items-center gap-1.5 md:gap-2">
          <input type="checkbox" value="Friday" v-model="form.weekends" class="form-checkbox" />
          FRI
        </label>
      </div>
      <div class="mb-4 mt-4">
        <label class="block text-sm mb-1">Start Month:</label>
        <input type="month" v-model="form.start_month" class="w-full border rounded p-2" />
      </div>

      <div class="mb-4">
        <label class="block text-sm mb-1">End Month (optional):</label>
        <input type="month" v-model="form.end_month" class="w-full border rounded p-2" />
      </div>

      <div class="flex justify-end gap-3 mt-4">
        <button @click="closeModal" class="btn-1">Done</button>
      </div>

      <button type="button" @click="closeModal" class="absolute top-1 right-2 text-red-500 text-xl">
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
