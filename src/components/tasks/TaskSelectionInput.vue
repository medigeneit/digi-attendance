<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import TodoInputTaskItem from '../todo/TodoInputTaskItem.vue'

const props = defineProps({
  todoType: {
    type: String,
    default: 'task',
  },
  taskId: {
    type: [String, Number],
    default: null,
  },
  show: {
    type: Boolean,
    default: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  taskQueryParams: {
    type: Object,
    default: () => {},
  },
  isOnlyMyTask: {
    type: Boolean,
    default: true,
  },
  filterTasks: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:todoType', 'update:taskId', 'update:show', 'addNewTaskClick'])

const searchText = ref('')

// Create computed setters/getters for two-way binding

const modelTaskId = computed({
  get: () => props.taskId,
  set: (val) => emit('update:taskId', val),
})

const modelShow = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val),
})

const anchor = ref(null)

const style = ref({})

function updatePosition() {
  if (!anchor?.value) return

  const rect = anchor.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight

  const boxHeight = 300 // adjust if dynamic
  const spaceBelow = viewportHeight - rect.bottom
  const placeOnTop = spaceBelow < boxHeight

  style.value = {
    position: 'fixed',
    top: placeOnTop ? rect.top - boxHeight + 'px' : rect.bottom + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
    zIndex: 5000,
  }
}

onMounted(async () => {
  fetchTasks()
  await nextTick()
  window.addEventListener('resize', updatePosition)
  document.addEventListener('scroll', updatePosition)
})

async function fetchTasks() {
  if (props.isOnlyMyTask) {
    await taskStore.fetchAllMyTasks(props.taskQueryParams)
  } else {
    await taskStore.fetchAllTasks(props.taskQueryParams)
  }
}

const taskStore = useTaskStore()

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePosition)
  document.removeEventListener('scroll', updatePosition)
})

function handleTaskClick(task) {
  modelTaskId.value = task.id
  modelShow.value = false
}
function clearValue() {
  modelTaskId.value = ''
  modelShow.value = false
}

const selectedTask = computed(() => {
  return [...(taskStore.tasks || [])].find((t) => t.id == modelTaskId.value)
})

const searchedTasks = computed(() => {
  const filteredTasks =
    typeof props.filterTasks === 'function'
      ? [...(taskStore.tasks || [])].filter((task) => props.filterTasks(task))
      : taskStore.tasks || []
  const text = searchText.value.trim().toUpperCase()

  if (text.length) {
    return filteredTasks.filter((task) => {
      return String(task.title || '')
        .toUpperCase()
        .includes(text)
    })
  }

  return filteredTasks
})
</script>
<template>
  <div class="relative border rounded-md shadow-sm flex items-center" ref="anchor">
    <div
      class="w-full px-4 py-2 focus:ring-2 focus:ring-blue-500 cursor-pointer flex items-center"
      @click.stop="
        () => {
          if (!readonly) {
            modelShow = true
            updatePosition()
          }
        }
      "
    >
      <div v-if="selectedTask?.title" class="line-clamp-1">
        {{ selectedTask?.id }} - {{ selectedTask?.title }}
      </div>
      <div v-else class="text-gray-500">Click to select todo</div>

      <div class="ml-auto flex items-center justify-center h-full gap-2">
        <button
          class="btn-icon fas fa-times !size-8 text-sm"
          v-if="modelTaskId && !readonly"
          @click.prevent.stop="() => clearValue()"
        ></button>
        <span class="fas fa-caret-down"></span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="modelShow"
        :style="style"
        class="fixed bg-white rounded-b-md shadow-lg border z-[5000] p-4"
      >
        <div class="flex items-center mb-2">
          <h2 class="text-sky-800 text-sm uppercase">Task List</h2>
          <button
            class="fas fa-redo text-gray-500 text-sm ml-4"
            @click.prevent="fetchTasks()"
          ></button>
          <button @click.prevent="() => (modelShow = false)" class="ml-auto">
            <i class="fas fa-times-circle text-red-700 text-xl hover:text-red-500"></i>
          </button>
        </div>

        <div class="relative">
          <div class="border flex rounded-t-md sticky top-0 bg-white">
            <input
              type="text"
              placeholder="Search task"
              class="w-full py-2 px-4 rounded-t-md outline-sky-200"
              v-model="searchText"
            />
            <label
              class="ml-auto flex w-8 items-center justify-center absolute right-0 top-0 bottom-0"
            >
              <i class="fas fa-search"></i>
            </label>
          </div>
        </div>

        <div class="max-h-[200px] min-h-[60px] overflow-y-auto">
          <div class="border" v-if="searchedTasks?.length > 0">
            <TodoInputTaskItem
              v-for="task in searchedTasks"
              :key="task.id"
              :task="task"
              @select="handleTaskClick"
              :selected="modelTaskId"
              class="group/main"
            >
            </TodoInputTaskItem>
          </div>
          <div
            v-else
            class="border h-[150px] flex flex-col items-center justify-center italic text-gray-500 text-sm"
          >
            <div>No Tasks Found</div>
            <button @click.prevent="emit('addNewTaskClick')" class="btn-3">Add New Task</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
