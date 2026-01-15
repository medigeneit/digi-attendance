<script setup>
import { getDisplayDate } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { computed, onMounted } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import UserChip from '../user/UserChip.vue'
import TodoStatusIcon from './TodoStatusIcon.vue'

const props = defineProps({
  todoDate: { type: Object, default: () => {} },
})

const todoDateStore = useTodoDateStore()
const authStore = useAuthStore()

const emit = defineEmits(['cancelClick', 'clickEdit', 'update', 'clickAddTodoDate'])

async function fetchTodo() {
  console.log({ todo_date: 'dd' })
  await todoDateStore.fetchTodoDate(props.todoDate?.id)
}

const selectedDate = computed(() => {
  if (!todoDateStore.todo_date?.date) {
    return null
  }
  return new Date(todoDateStore.todo_date?.date)
})

const isOwnTodo = computed(() => {
  // return true
  return todoDateStore.todo_date?.user?.id === authStore.user?.id
})

async function handleClickDelete(todo) {
  if (confirm(`Are your sure want to delete todo\n'${todoDateStore.todo_date?.title}'`)) {
    await todoDateStore.deleteTodoDate(todo.id)
    emit('update')
  }
}

async function handleChangeTodoStatus(todo, status) {
  if (confirm(`Are your sure want to compete todo\n'${todoDateStore.todo_date?.title}'`)) {
    await todoDateStore.updateStatus(todo.id, status)
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
      v-if="todoDateStore.loading"
      class="absolute inset-0 bg-opacity-80 text-center py-4 text-gray-500 z-10 flex items-center justify-center"
    >
      Loading...
    </LoaderView>

    <div>
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Show Todo</h2>
      </div>

      <div class="min-h-[10vh] max-h-[50vh] overflow-y-auto p-4">
        <!-- {{ todo }} -->

        <div class="mb-4">
          <div class="font-semibold text-xs text-gray-500">Date</div>
          <span>
            {{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}
          </span>
        </div>

        <!-- <pre class="overflow-y-auto">{{ todoDateStore.todo_date }}</pre> -->

        <div class="mb-4 flex justify-between items-end">
          <div>
            <div class="text-xs text-gray-500">Todo</div>
            {{ todoDateStore.todo_date?.title }}
            <div v-if="todoDateStore?.todo_date?.todo?.tags?.length > 0" class="mt-1">
              <span
                class="bg-gray-100 px-2 rounded-full border border-blue-500 text-blue-500"
                v-for="tag in todoDateStore?.todo_date?.todo?.tags || []"
                :key="tag.id"
              >
                {{ tag.name }}
              </span>
            </div>
          </div>

          <button
            class="btn-2 bg-sky-400 text-white hover:bg-sky-600 hover:text-white bg-none"
            @click.prevent.stop="emit('clickEdit', todoDateStore.todo_date?.todo)"
          >
            <i class="fas fa-pen"></i> Edit Todo
          </button>
        </div>

        <div class="mt-1 flex items-center gap-2 mb-4" v-if="todoDate?.user">
          <UserChip :user="todoDate.user" avatar-size="xsmall" />
          <div
            class="border border-sky-400 rounded-full text-sky-500 font-semibold bg-sky-50 px-1 py-0.5 text-xs inline-block"
          >
            {{ todoDate.user?.department?.name }}
          </div>
        </div>

        <div>
          <div class="text-xs text-gray-500">Status</div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <TodoStatusIcon
                :todoDate="todoDateStore?.todo_date"
                v-if="todoDateStore?.todo_date"
              />
              {{ todoDateStore.todo_date?.status }}
            </div>

            <div class="flex items-center gap-2" v-if="isOwnTodo && !todoDateStore.loading">
              <button
                v-if="todoDateStore.todo_date?.status === 'PENDING'"
                class="btn-2 from-yellow-700 to-yellow-500 text-white hover:bg-green-600 hover:text-white"
                @click.prevent.stop="
                  () => handleChangeTodoStatus(todoDateStore.todo_date, 'WORKING')
                "
              >
                <i class="fas fa-exclamation-circle"></i> Change to Working
              </button>
              <button
                v-if="todoDateStore.todo_date?.status === 'WORKING'"
                class="btn-2 from-green-700 to-green-300 text-white hover:bg-green-600 hover:text-white"
                @click.prevent.stop="
                  () => handleChangeTodoStatus(todoDateStore.todo_date, 'COMPLETED')
                "
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

      <div class="ml-auto flex items-center gap-2" v-if="isOwnTodo && !todoDateStore.loading">
        <button
          class="btn-2 bg-green-600 text-white hover:bg-green-700 hover:text-white bg-none"
          @click.prevent.stop="
            emit(
              'clickAddTodoDate',
              todoDateStore.todo_date?.todo_id,
              todoDateStore.todo_date?.date,
            )
          "
        >
          <i class="fas fa-plus"></i> Add To another date
        </button>

        <!-- <button
          class="btn-2 bg-sky-400 text-white hover:bg-sky-600 hover:text-white bg-none"
          @click.prevent.stop="emit('clickEdit', todoDateStore.todo_date)"
        >
          <i class="fas fa-pen"></i> Edit
        </button> -->
        <button
          class="btn-2-red"
          @click.prevent.stop="() => handleClickDelete(todoDateStore.todo_date)"
        >
          <i class="fas fa-trash-alt"></i> Delete
        </button>
      </div>
    </div>
  </div>
</template>
