<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TaskSelectionInput from '../tasks/TaskSelectionInput.vue'

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
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:todoType', 'update:todoTypeId', 'update:show'])

// Create computed setters/getters for two-way binding

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

onMounted(async () => {
  await nextTick()
  // updatePosition()

  window.addEventListener('resize', updatePosition)
  document.addEventListener('scroll', updatePosition)
})

const taskStore = useTaskStore()

watch(
  () => modelShow.value,
  async (shown) => {
    if (shown) {
      await taskStore.fetchAllMyTasks()
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePosition)
  document.removeEventListener('scroll', updatePosition)
})
</script>
<template>
  <div>
    <TaskSelectionInput
      v-model:show="modelShow"
      v-model:taskId="modelTodoTypeId"
      :readonly="readonly"
    />
  </div>
</template>
