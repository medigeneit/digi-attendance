<script setup>
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, nextTick, onMounted, ref } from 'vue'

import LoaderView from '../common/LoaderView.vue'
import FormHandler from '../FormHandler.vue'
import TodoTypeInput from './TodoTypeInput.vue'

const props = defineProps({
  date: { type: String, default: getYearMonthDayFormat(new Date()) },
  todo: { type: Object, default: () => {} },
})

const state = ref()
const showTodoTypes = ref(false)
const titleRef = ref()
const todoStore = useTodoStore()

const emit = defineEmits(['update', 'cancelClick'])

const form = ref({
  title: '',
  todo_type: 'task',
  todo_type_id: '',
})

async function fetchTodo() {
  await todoStore.fetchTodo(props.todo?.id)
  form.value.title = todoStore.todo?.title
  form.value.todo_type_id = todoStore.todo?.todoable_id
}

async function handleFormSubmit() {
  state.value = 'submitting'

  console.log({ form: form.value })

  try {
    await todoStore.updateTodo(props.todo.id, form.value)
    emit('update')
  } finally {
    state.value = ''
  }
}

const selectedDate = computed(() => {
  return new Date(props.todo.date)
})

onMounted(async () => {
  await fetchTodo()
  await nextTick()
  titleRef.value?.focus()
})
</script>

<template>
  <div class="relative" @click="showTodoTypes = false">
    <LoaderView
      v-if="todoStore.loading"
      class="absolute inset-0 bg-opacity-80 text-center py-4 text-gray-500 z-10 flex items-center justify-center"
    >
      Loading...
    </LoaderView>
    <FormHandler
      @submit="handleFormSubmit"
      @clickCancel="emit('cancelClick')"
      :isSubmitting="state == 'submitting'"
      :isLoading="todoStore.loading"
      :error="todoStore.error"
      id="todoEditForm"
    >
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Edit Todo</h2>
      </div>
      <div class="p-4 min-h-[10vh] max-h-[50vh] overflow-y-auto">
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
          <TodoTypeInput
            v-model:show="showTodoTypes"
            v-model:todoType="form.todo_type"
            v-model:todoTypeId="form.todo_type_id"
          />
        </div>
      </div>
    </FormHandler>
  </div>
</template>
