<script setup>
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import FormHandler from '../FormHandler.vue'
import LoaderView from '../common/LoaderView.vue'
import TodoTypeInput from './TodoTypeInput.vue'

const props = defineProps({
  date: { type: String, default: getYearMonthDayFormat(new Date()) },
  userRole: { type: String, default: 'employee' },
  todoType: { type: String, default: null },
  todoTypeId: { type: String, default: null },
  readonlyValues: {
    type: Object,
    default: () => ({
      date: false,
      todo_type_id: false,
    }),
  },
})

const state = ref()
const showTodoTypes = ref(false)
const titleRef = ref()
const todoStore = useTodoStore()

const emit = defineEmits(['update', 'cancelClick'])

const form = ref({
  title: '',
  date: props.date || '',
  todo_type: '',
  todo_type_id: '',
})

async function handleFormSubmit() {
  try {
    state.value = 'submitting'

    if (!form.value?.todo_type_id) {
      form.value = {
        title: form.value.title,
        date: form.value.date,
      }
    }

    await todoStore.createTodo(form.value, {
      returnWith: props.userRole !== 'employee' ? 'user,department,company' : '',
    })
    emit('update')
  } finally {
    state.value = ''
  }
}

watch(
  () => ({
    date: props.date,
    todo_type: props.todoType,
    todo_type_id: props.todoTypeId,
  }),
  (newValue) => {
    form.value = newValue
  },
  { immediate: true },
)

const selectedDate = computed(() => {
  return new Date(props.date)
})

onMounted(async () => {
  await nextTick()
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
      :error="todoStore.error"
      class="rounded-md relative"
    >
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Add Todo</h2>
      </div>

      <!-- <div>{{ props }}</div>
      <div>{{ form }}</div> -->

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
          <label class="block text-gray-700 font-medium mb-2">Date</label>
          <input
            :readonly="readonlyValues?.date"
            v-model="form.date"
            type="date"
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
            :readonly="readonlyValues?.todo_type_id"
          />
        </div>
      </div>
    </FormHandler>
  </div>
</template>
