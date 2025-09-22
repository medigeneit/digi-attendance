<script setup>
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, nextTick, onMounted, ref } from 'vue'
import FormHandler from '../FormHandler.vue'

const props = defineProps({
  date: { type: String, default: getYearMonthDayFormat(new Date()) },
})

const state = ref()
const titleRef = ref()
const todoStore = useTodoStore()

const emit = defineEmits(['update', 'cancelClick'])

const form = ref({
  title: '',
  date: props.date || '',
  task_id: '',
})

async function handleFormSubmit() {
  state.value = 'submitting'
  await todoStore.createTodo(form.value)
  console.log(form.value)
  state.value = ''
  emit('update')
}

const selectedDate = computed(() => {
  return new Date(props.date)
})

onMounted(async () => {
  await nextTick()
  titleRef.value?.focus()
})
</script>

<template>
  <div>
    <FormHandler
      @submit="handleFormSubmit"
      @clickCancel="emit('cancelClick')"
      :isSubmitting="state == 'submitting'"
      :error="todoStore.error"
    >
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Add Todo</h2>
      </div>

      <div class="p-4">
        <div class="mb-2">
          <span class="font-semibold"> Date </span>
          <span>
            {{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}
          </span>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Title</label>
          <input
            ref="titleRef"
            v-model="form.title"
            required
            placeholder="Enter todo title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Task ID (optional)</label>
          <input
            v-model="form.task_id"
            placeholder="Enter a task id"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </FormHandler>
  </div>
</template>
