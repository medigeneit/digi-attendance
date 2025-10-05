<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  todoType: {
    type: String,
    default: 'task',
  },
  todoTypeId: {
    type: [String, Number],
    default: null,
  },
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:todoType', 'update:todoTypeId', 'update:show'])

// Create computed setters/getters for two-way binding
const modelTodoType = computed({
  get: () => props.todoType,
  set: (val) => emit('update:todoType', val),
})

const modelTodoTypeId = computed({
  get: () => props.todoTypeId,
  set: (val) => emit('update:todoTypeId', val),
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

function handleTaskClick(task) {
  modelTodoTypeId.value = task.id
  modelShow.value = false
}
function clearValue(_task) {
  modelTodoTypeId.value = ''
  modelShow.value = false
}

onMounted(async () => {
  await nextTick()
  // updatePosition()

  window.addEventListener('resize', updatePosition)
  document.addEventListener('scroll', updatePosition)

  modelShow.value = true

  modelTodoType.value = 'task'
})

const taskStore = useTaskStore()

watch(
  () => modelShow.value,
  async (shown) => {
    if (shown) {
      await taskStore.fetchMyTasks()
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePosition)
  document.removeEventListener('scroll', updatePosition)
})
</script>
<template>
  <div class="relative" ref="anchor">
    <div
      class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 cursor-pointer flex items-center"
      :class="modelTodoTypeId ? '' : 'text-gray-400'"
      @click.stop="
        () => {
          modelShow = true
          updatePosition()
        }
      "
    >
      {{ modelTodoTypeId || 'Click to select todo' }}

      <button
        class="btn-icon fas fa-times !size-8 text-sm ml-auto"
        v-if="modelTodoTypeId"
        @click.prevent.stop="clearValue"
      ></button>
    </div>
    <Teleport to="body">
      <div
        v-if="modelShow"
        :style="style"
        class="fixed h-[300px] bg-white rounded-b-md overflow-y-auto shadow-lg border z-[5000] p-4"
      >
        <div class="border">
          <div
            v-for="task in taskStore.tasks"
            :key="task.id"
            class="px-2 border-b py-3 over text-sm relative group/main"
          >
            <div class="flex items-center py-1">
              <div
                :class="[
                  'line-clamp-2 mr-4 ',
                  { 'text-red-50 bg-green-800 px-2': task.id == modelTodoTypeId },
                  { 'group-hover/main:text-blue-500': task.id != modelTodoTypeId },
                ]"
              >
                {{ task.title }}
              </div>
              <button class="border btn-2 ml-auto" @click.prevent="() => handleTaskClick(task)">
                Select
              </button>
            </div>
            <div class="border ml-4 mt-4" v-if="task?.children_tasks?.length">
              <div
                v-for="subTask in task?.children_tasks || []"
                :key="subTask.id"
                class="px-2 border-b py-3 over text-sm relative group/sub"
              >
                <div class="line-clamp-1 group-hover/sub:text-green-500">
                  {{ subTask.title }}
                </div>
                <button
                  class="border absolute right-2 top-1 btn-2 from-green-100 to-green-50 border-green-700 text-green-800 hover:text-green-900"
                  @click.prevent="() => handleTaskClick(subTask)"
                >
                  Select
                </button>
                <div class="border ml-4 mt-2" v-if="subTask?.children_tasks?.length">
                  <div
                    v-for="subSubTask in subTask?.children_tasks || []"
                    :key="subSubTask.id"
                    class="px-2 border-b py-4 over text-sm relative group/subSub"
                  >
                    <div class="line-clamp-1 group-hover/subSub:text-purple-800">
                      {{ subSubTask.title }}
                    </div>
                    <button
                      class="border absolute right-2 top-2 btn-2 from-green-100 to-purple-50 border-purple-700 text-purple-800 hover:text-purple-900"
                      @click.prevent="() => handleTaskClick(subSubTask)"
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
