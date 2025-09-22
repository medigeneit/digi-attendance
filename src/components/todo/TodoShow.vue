<script setup>
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, nextTick, onMounted } from 'vue'
import TodoStatusIcon from './TodoStatusIcon.vue'

const props = defineProps({
  date: { type: String, default: getYearMonthDayFormat(new Date()) },
  todo: { type: Object, default: () => {} },
})

const todoStore = useTodoStore()

const emit = defineEmits(['cancelClick', 'clickEdit'])

async function fetchTodo() {
  await todoStore.fetchTodo(props.todo?.id)
}

const selectedDate = computed(() => {
  if (!todoStore.todo?.date) {
    return null
  }
  return new Date(todoStore.todo?.date)
})

onMounted(async () => {
  await fetchTodo()
})
</script>

<template>
  <div>
    <div>
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Show Todo</h2>
      </div>
      <div class="min-h-[20vh] p-4">
        <!-- {{ todo }} -->

        <div class="mb-4">
          <div class="font-semibold text-xs text-gray-500">Date</div>
          <span>
            {{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}
          </span>
        </div>

        <div class="mb-4">
          <div class="text-xs text-gray-500">Todo</div>
          {{ todoStore.todo?.title }}
        </div>
        <div>
          <div class="text-xs text-gray-500">Status</div>
          <div>
            <TodoStatusIcon :todo="todoStore?.todo" v-if="todoStore?.todo" />
            {{ todoStore.todo?.status }}
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-between items-center gap-4 py-4 px-4 border-t">
      <button type="button" @click="emit('cancelClick')" class="btn-3">Cancel</button>
      <button :disabled="todoStore.loading" @click="emit('clickEdit', props.todo)" class="btn-2">
        Edit
      </button>
    </div>
  </div>
</template>
