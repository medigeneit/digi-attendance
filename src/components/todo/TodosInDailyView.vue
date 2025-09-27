<script setup>
import { getDisplayDate } from '@/libs/datetime'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, ref } from 'vue'
import DraggableList from '../common/DraggableList.vue'
import UserChip from '../user/UserChip.vue'
import TodosInDate from './TodosInDate.vue'
import TodoStatusIcon from './TodoStatusIcon.vue'

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
})

const draggableTodos = ref(null)
const emit = defineEmits([
  'clickTodo',
  'clickAdd',
  'clickEdit',
  'clickDelete',
  'clickChangeStatus',
  'backClick',
  'update',
])

const selectedDate = computed(() => {
  return new Date(props.date)
})

const todoStore = useTodoStore()

async function handleClickDelete(todo) {
  if (confirm(`Are your sure want to delete todo\n'${todo?.title}'`)) {
    await todoStore.deleteTodo(todo.id)
    emit('update')
  }
}

async function handleClickComplete(todo) {
  if (confirm(`Are your sure want to compete todo\n'${todo?.title}'`)) {
    await todoStore.updateTodoStatus(todo.id, 'COMPLETED')
    emit('update')
  }
}

async function handleTodosRearrange() {
  const ids = draggableTodos?.value.items?.map((item) => item.id)

  await todoStore.rearrangeMyTodos(ids, { date: props.date })

  emit('update')
}
</script>
<template>
  <div class="relative bg-white p-4">
    <div
      class="text-red-500 text-sm border border-red-300 max-w-6xl mx-auto py-2 gap-2 shadow-sm rounded flex items-center px-3"
      v-if="todoStore.error"
    >
      <i class="fad fa-exclamation-circle"></i>
      <div>
        {{ todoStore.error }}
      </div>
    </div>

    <div class="max-w-6xl mx-auto border rounded my-5">
      <div class="mb-4 text-gray-700 border-b py-2 px-4 flex items-center">
        <button class="fa fa-arrow-left btn-icon mr-2" @click.prevent="emit('backClick')"></button>
        <div class="text-lg font-semibold">
          {{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}
        </div>

        <div class="ml-auto flex items-center gap-2">
          <div class="flex items-center gap-3 mr-6" v-if="draggableTodos?.isItemsChanged">
            <button
              @click.prevent="() => handleTodosRearrange()"
              class="btn-2 disabled:opacity-40 disabled:pointer-events-none"
              :disabled="todoStore.updatingPriority"
            >
              Save Rearranged
            </button>
            <button
              @click.prevent="() => draggableTodos.resetItems()"
              class="btn-3 disabled:opacity-40 disabled:pointer-events-none"
              :disabled="todoStore.updatingPriority"
            >
              Discard
            </button>
          </div>

          <button class="btn btn-icon" @click.prevent="emit('clickAdd', props.date)">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
      <TodosInDate :date="date" max-items="all" class="my-8 w-full px-4">
        <template #todoItems="{ allTodos }">
          <DraggableList :items="allTodos" ref="draggableTodos" handle="handle">
            <template #item="{ item: todo }">
              <div
                class="border rounded px-4 py-3 my-4 hover:bg-sky-50 cursor-pointer flex items-center"
                @click.prevent="emit('clickTodo', todo)"
              >
                <!-- v-for="todo in allTodos"
                :key="todo.id" -->
                <TodoStatusIcon :todo="todo" />

                <div class="ml-4">
                  <div class="line-clamp-2">{{ todo.id }} - {{ todo.title }}</div>

                  <div class="mt-1 flex items-center gap-2" v-if="todo.user">
                    <UserChip :user="todo.user" avatar-size="xsmall" />
                    <div
                      class="border border-sky-400 rounded-full text-sky-500 font-semibold bg-sky-50 px-1 py-0.5 text-xs inline-block"
                    >
                      {{ todo.user?.department?.name }}
                    </div>
                  </div>

                  <!-- <div>{{ todo.user?.department }}</div> -->
                </div>
                <div
                  class="line-clamp-2 ml-4 text-gray-500"
                  v-if="todo.todo_type && todo.todo_type_id"
                >
                  {{ todo.todo_type }} id: {{ todo.todo_type_id }}
                </div>

                <div class="ml-auto flex items-center gap-2">
                  <button
                    v-if="todo.status === 'WORKING'"
                    class="btn-icon bg-green-400 text-white hover:bg-green-600 hover:text-white"
                    @click.prevent.stop="() => handleClickComplete(todo)"
                  >
                    <i class="fas fa-check"></i>
                  </button>
                  <button
                    class="btn-icon bg-gray-400 text-white hover:bg-gray-600 hover:text-white handle"
                  >
                    <i class="fas fa-arrows-alt-v"></i>
                  </button>
                  <button
                    class="btn-icon bg-sky-400 text-white hover:bg-sky-600 hover:text-white"
                    @click.prevent.stop="emit('clickEdit', todo)"
                  >
                    <i class="fas fa-pen"></i>
                  </button>
                  <button
                    class="btn-icon bg-red-400 text-white hover:bg-red-600 hover:text-white"
                    @click.prevent.stop="() => handleClickDelete(todo)"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            </template>
          </DraggableList>
        </template>
        <template #noTodos>
          <div
            class="flex min-h-[38vh] items-center justify-center text-gray-400 text-center rounded-md"
          >
            No Todos
          </div>
        </template>
      </TodosInDate>
    </div>
  </div>
</template>
