<script setup>
import { getDisplayDate } from '@/libs/datetime'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, onMounted } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import TodoStatusIcon from './TodoStatusIcon.vue'

const props = defineProps({
  todo: { type: Object, default: () => {} },
})

const todoStore = useTodoStore()

const emit = defineEmits(['cancelClick', 'clickEdit', 'update'])

async function fetchTodo() {
  await todoStore.fetchTodo(props.todo?.id)
}

const selectedDate = computed(() => {
  if (!todoStore.todo?.date) {
    return null
  }
  return new Date(todoStore.todo?.date)
})

async function handleClickDelete(todo) {
  if (confirm(`Are your sure want to delete todo\n'${todoStore.todo?.title}'`)) {
    await todoStore.deleteTodo(todo.id)
    emit('update')
  }
}

async function handleChangeTodoStatus(todo, status) {
  if (confirm(`Are your sure want to compete todo\n'${todoStore.todo?.title}'`)) {
    await todoStore.updateTodoStatus(todo.id, status)
    emit('update')
  }
}

onMounted(async () => {
  await fetchTodo()
})
</script>

<template>
  <div class="relative">
    <LoaderView
      v-if="todoStore.loading"
      class="absolute inset-0 bg-opacity-80 text-center py-4 text-gray-500 z-10 flex items-center justify-center"
    >
      Loading...
    </LoaderView>

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
          <div class="flex items-center gap-4">
            <div>
              <TodoStatusIcon :todo="todoStore?.todo" v-if="todoStore?.todo" />
              {{ todoStore.todo?.status }}
            </div>

            <div class="flex items-center gap-2" v-if="!todoStore.loading">
              <button
                v-if="todoStore.todo?.status === 'PENDING'"
                class="btn-2 from-yellow-700 to-yellow-500 text-white hover:bg-green-600 hover:text-white"
                @click.prevent.stop="() => handleChangeTodoStatus(todoStore.todo, 'WORKING')"
              >
                <i class="fas fa-exclamation-circle"></i> Change to Working
              </button>
              <button
                v-if="todoStore.todo?.status === 'WORKING'"
                class="btn-2 from-green-700 to-green-300 text-white hover:bg-green-600 hover:text-white"
                @click.prevent.stop="() => handleChangeTodoStatus(todoStore.todo, 'COMPLETED')"
              >
                <i class="fas fa-check"></i> Make Complete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-between items-center gap-4 py-4 px-4 border-t">
      <button type="button" @click="emit('cancelClick')" class="btn-3">Cancel</button>

      <div class="ml-auto flex items-center gap-2">
        <button
          class="btn-2 bg-sky-400 text-white hover:bg-sky-600 hover:text-white"
          @click.prevent.stop="emit('clickEdit', todoStore.todo)"
        >
          <i class="fas fa-pen"></i> Edit
        </button>
        <button class="btn-2-red" @click.prevent.stop="() => handleClickDelete(todoStore.todo)">
          <i class="fas fa-trash-alt"></i> Delete
        </button>
      </div>
    </div>
  </div>
</template>
