<script setup>
import { getDisplayDate } from '@/libs/datetime'
import { getTodoHistories } from '@/services/todo'
import { useAuthStore } from '@/stores/auth'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { computed, onMounted, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import UserChip from '../user/UserChip.vue'
import TodoStatusIcon from './TodoStatusIcon.vue'

const props = defineProps({
  todoDate: { type: [Object, Number], default: null },
})

const todoDateStore = useTodoDateStore()
const authStore = useAuthStore()

const emit = defineEmits(['cancelClick', 'clickEdit', 'update', 'clickAddTodoDate'])

const lastFetchedId = ref(null)
const isFetching = ref(false)

const incomingId = computed(() => {
  if (!props.todoDate) return null
  if (typeof props.todoDate === 'number') return props.todoDate
  return props.todoDate?.id || null
})

async function fetchTodo(id) {
  const todoDateId = id || incomingId.value
  if (!todoDateId) return

  if (isFetching.value && lastFetchedId.value === todoDateId) {
    console.log('fetchTodo: already fetching', todoDateId)
    return
  }

  // mark fetching
  isFetching.value = true
  lastFetchedId.value = todoDateId
  console.log('fetchTodo:start', todoDateId, new Date().toISOString())

  try {
    await todoDateStore.fetchTodoDate(todoDateId)

    const todoId = todoDateStore.todo_date?.todo_id || todoDateStore.todo_date?.todo?.id
    if (todoId) {
      try {
        const resp = await getTodoHistories(todoId)
        historyDates.value = resp.data?.todo_dates || []
      } catch (e) {
        console.error('getTodoHistories failed', e)
      }
    }
  } catch (e) {
    console.error('fetchTodo failed', e)
  } finally {
    isFetching.value = false
    console.log('fetchTodo:end', todoDateId, new Date().toISOString())
  }
}
const showHistory = ref(false)

const projectName = computed(() => {
  const t = todoDateStore.todo_date?.todo
  return (
    t?.project?.name ||
    t?.project?.title ||
    t?.project?.display_name ||
    t?.project?.project_name ||
    ''
  )
})

const historyDates = ref([])

const concurrentDates = computed(() => {
  const list = historyDates.value || []
  return [...list].sort((a, b) => {
    const da = a?.date ? new Date(a.date).getTime() : 0
    const db = b?.date ? new Date(b.date).getTime() : 0
    return db - da
  })
})

async function handleClickHistoryDate(id) {
  if (!id) return
  await todoDateStore.fetchTodoDate(id)
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

// fetch once when component mounts (parent mounts the modal when opening)
onMounted(async () => {
  const id = incomingId.value
  if (id) await fetchTodo(id)
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

        <!-- <pre class="overflow-y-auto">{{ todoDateStore.todo_date }}</pre> -->

        <div class="mb-4 flex justify-between items-end">
          <div>
            <div class="text-xs text-gray-500">Todo</div>
            <div class="text-base font-semibold">{{ todoDateStore.todo_date?.title }}</div>
            <div v-if="projectName" class="text-xs text-slate-400 mt-1">{{ projectName }}</div>
          </div>

          <button
            class="btn-2 bg-sky-400 text-white hover:bg-sky-600 hover:text-white bg-none"
            @click.prevent.stop="emit('clickEdit', todoDateStore.todo_date?.todo)"
          >
            <i class="fas fa-pen"></i> Edit Todo
          </button>
        </div>

        <hr class="mb-4" />

        <div class="mb-4 flex justify-between items-center group">
          <div>
            <div class="font-semibold text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
              Date
            </div>
            <div class="text-sm font-semibold text-slate-700">
              {{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}
            </div>
          </div>

          <button
            v-if="isOwnTodo && !todoDateStore.loading"
            class="btn-2 bg-emerald-500 text-white hover:bg-emerald-700 hover:text-white bg-none"
            @click.prevent.stop="
              emit(
                'clickAddTodoDate',
                todoDateStore.todo_date?.todo_id,
                todoDateStore.todo_date?.date,
              )
            "
          >
            <i class="fas fa-calendar-plus mr-1"></i> Add to another date
          </button>
        </div>

        <div class="mt-1 flex items-center gap-2 mb-4" v-if="todoDateStore.todo_date?.user">
          <UserChip :user="todoDateStore.todo_date.user" avatar-size="xsmall" />
          <div
            class="border border-sky-400 rounded-full text-sky-500 font-semibold bg-sky-50 px-1 py-0.5 text-xs inline-block"
          >
            {{ todoDateStore.todo_date?.user?.department?.name }}
          </div>
        </div>

        <div class="flex items-center justify-between mb-4">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Current Status
          </div>
          <div
            class="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-slate-100"
          >
            <TodoStatusIcon :todoDate="todoDateStore?.todo_date" v-if="todoDateStore?.todo_date" />
            <span class="text-xs font-bold text-slate-700 tracking-wide">{{
              todoDateStore.todo_date?.status
            }}</span>
          </div>
        </div>
        <div class="mt-6 p-4 rounded-xl border border-slate-200 border-dashed">
          <div
            v-if="
              isOwnTodo && !todoDateStore.loading && todoDateStore.todo_date?.status !== 'COMPLETED'
            "
          >
            <div
              class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center"
            >
              Quick Transitions
            </div>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-if="todoDateStore.todo_date?.status !== 'WORKING'"
                class="btn-2 py-2.5 from-amber-600 to-amber-400 text-white hover:scale-[1.02] active:scale-[0.98] shadow-md transition-all duration-200"
                @click.prevent.stop="
                  () => handleChangeTodoStatus(todoDateStore.todo_date, 'WORKING')
                "
              >
                <i class="fas fa-sync-alt mr-1"></i> Working
              </button>

              <button
                v-if="
                  todoDateStore.todo_date?.status !== 'COMPLETED' &&
                  todoDateStore.todo_date?.status !== 'BACK_LOG'
                "
                class="btn-2 py-2.5 from-emerald-600 to-emerald-400 text-white hover:scale-[1.02] active:scale-[0.98] shadow-md transition-all duration-200"
                @click.prevent.stop="
                  () => handleChangeTodoStatus(todoDateStore.todo_date, 'COMPLETED')
                "
              >
                <i class="fas fa-check-double mr-1"></i> Complete
              </button>

              <button
                v-if="todoDateStore.todo_date?.status !== 'DEPENDANT'"
                class="btn-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm transition-all duration-200"
                @click.prevent.stop="
                  () => handleChangeTodoStatus(todoDateStore.todo_date, 'DEPENDANT')
                "
              >
                <i class="fas fa-pause-circle mr-1"></i> Dependant / Pause
              </button>

              <button
                v-if="todoDateStore.todo_date?.status !== 'BACK_LOG'"
                class="btn-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm transition-all duration-200"
                @click.prevent.stop="
                  () => handleChangeTodoStatus(todoDateStore.todo_date, 'BACK_LOG')
                "
              >
                <i class="fas fa-history mr-1"></i> Backlog
              </button>
            </div>
          </div>

          <div
            v-else-if="todoDateStore.todo_date?.status === 'COMPLETED'"
            class="py-4 text-center text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100"
          >
            <i class="fas fa-check-circle text-2xl mb-1"></i>
            <div class="text-xs font-bold uppercase tracking-wider">This Todo is Completed</div>
          </div>
        </div>
      </div>

      <hr class="mx-4" />

      <div class="px-4 mb-4">
        <!-- Todo history: collapsed by title -->
        <div class="mt-4">
          <h2
            class="w-full text-left flex items-center justify-between cursor-pointer py-2 bg-white rounded-md"
            @click.prevent="showHistory = !showHistory"
          >
            <div class="text-sm font-bold text-slate-600 uppercase tracking-widest">
              Todo history ({{ concurrentDates.length }})
            </div>
            <div class="text-lg text-slate-500">{{ showHistory ? '▾' : '▸' }}</div>
          </h2>

          <div
            v-if="showHistory"
            class="mt-0.5 max-h-40 overflow-y-auto border rounded p-2 bg-white"
          >
            <div v-if="concurrentDates.length === 0" class="text-xs text-slate-400 py-2">
              No history
            </div>
            <div
              v-for="d in concurrentDates"
              :key="d.id"
              class="flex items-center justify-between py-2 px-2 hover:bg-slate-50 border-b last:border-b-0"
            >
              <div>
                <a
                  href="#"
                  @click.prevent="handleClickHistoryDate(d.id)"
                  class="text-sm font-semibold text-sky-600"
                  >{{ d.date }}
                </a>
                <div class="text-xs text-slate-400">{{ d.status }}</div>
              </div>
              <div>
                <span
                  v-if="d.id === todoDateStore.todo_date?.id"
                  class="text-xs text-emerald-600 font-bold"
                  >Current</span
                >
                <button
                  v-else
                  class="btn-2 py-1 px-2 text-xs"
                  @click.prevent="handleClickHistoryDate(d.id)"
                >
                  Show
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-between items-center gap-4 py-4 px-4 border-t">
      <button type="button" @click="emit('cancelClick')" class="btn-3">Cancel</button>

      <div class="ml-auto flex items-center gap-2" v-if="isOwnTodo && !todoDateStore.loading">
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
