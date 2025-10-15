<script setup>
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { useTodoStore } from '@/stores/useTodoStore'
import { nextTick, onMounted, ref } from 'vue'
import FormHandler from '../FormHandler.vue'
import LoaderView from '../common/LoaderView.vue'

const props = defineProps({
  date: { type: [String, Number], default: getYearMonthDayFormat(new Date()) },
  todoId: { type: [String, Number], required: true },
  userRole: { type: String, default: 'employee' },
})

const state = ref()
const showTodoTypes = ref(false)
const titleRef = ref()
const todoStore = useTodoStore()
const todoDateStore = useTodoDateStore()

const emit = defineEmits(['update', 'cancelClick'])

const form = ref({
  date: props.date || '',
  todo_id: props.todoId,
})

async function handleFormSubmit() {
  try {
    state.value = 'submitting'

    await todoDateStore.createTodoDate(form.value)

    emit('update')
  } finally {
    state.value = ''
  }
}

onMounted(async () => {
  await nextTick()
  await todoStore.fetchTodo(props.todoId)
  titleRef.value?.focus()
})
</script>

<template>
  <div @click="showTodoTypes = false">
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
      :error="todoDateStore.error"
      class="rounded-md relative"
    >
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Carry Todo To Date</h2>
      </div>

      <div class="p-4 min-h-[10vh] max-h-[50vh] overflow-y-auto">
        <!-- <div>TODO_ID: {{ props.todoId }}</div> -->
        <div class="mb-4 text-md">
          TODO:
          <span class="font-semibold">{{ todoStore.todo?.title }}</span>
        </div>

        <div class="mb-2">
          <span class="font-semibold"> Date </span>
          <input
            v-model="form.date"
            type="date"
            multiple
            required
            placeholder="Enter todo title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </FormHandler>
  </div>
</template>
