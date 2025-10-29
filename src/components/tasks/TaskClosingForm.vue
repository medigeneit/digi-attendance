<script setup>
import { updateTaskStatus } from '@/services/task'
import { computed, ref } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  task: { type: Object, default: () => {} },
})
const emit = defineEmits(['clickCancel', 'updateStatus', 'error', 'update:loading'])

const isLoading = computed({
  get: () => props.loading,
  set: () => emit('update:loading'),
})

const error = ref('')

async function handleStatusSubmit() {
  isLoading.value = true
  try {
    await updateTaskStatus(props.task.id, { status: 'CLOSED' })

    emit('updateStatus')
  } catch (err) {
    error.value = err.response?.data?.message
    emit('error')
  } finally {
    isLoading.value = false
  }
}
</script>
<template>
  <form class="p-4 rounded relative border" @submit.prevent="handleStatusSubmit">
    <LoaderView
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-opacity-90"
    >
      Submitting!
    </LoaderView>
    <h3 class="border-b -mx-4 px-4 -mt-4 py-2 text-xl bg-gray-50">Task Closing</h3>
    <div class="my-6">
      <div class="text-center font-semibold text-blue-800 mb-4">
        {{ task?.title }}
      </div>
      <div class="text-center my-1 text-lg">Are you sure?</div>
      <div class="text-center my-1">
        Want to
        <span
          class="border px-2 rounded-md bg-gray-50 border-blue-300 text-blue-400 inline-flex items-center gap-1"
        >
          <i class="text-sm fas fa-lock text-blue-600"></i>Close</span
        >
        the task?
      </div>
    </div>
    <hr class="mt-3 -mx-4" />
    <div>
      <div class="text-red-600 text-center mt-2 text-sm">{{ error }}</div>
      <div class="flex justify-between mt-3">
        <button class="btn-3" @click.prevent="emit('clickCancel')">Cancel</button>
        <button class="btn-2"><i class="text-xl text-white fas fa-lock"></i> Close</button>
      </div>
    </div>
  </form>
</template>
