<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, ref, watch } from 'vue'
import TaskStatus from '../tasks/TaskStatus.vue'

const props = defineProps({
  fromDepartmentId: {
    type: Number,
  },
  requirementDetail: {
    type: Object,
  },
})

const emit = defineEmits(['parentIdSelect', 'cancelClick', 'assignTask'])
const taskStore = useTaskStore()
const assignType = ref('')
const selectedTask = ref(null)

watch(
  () => assignType.value,
  (chosen) => {
    if (['sub-task', 'direct-assign'].includes(chosen)) {
      taskStore.fetchTasks({ 'from-department-id': props.fromDepartmentId })
    }
  },
  { immediate: true },
)

function handleTaskClick(task) {
  if (assignType.value == 'sub-task') {
    emit('parentIdSelect', task.id)
  } else {
    if (task.requirement_detail_id) {
      //return alert("This task already assigned to another requirement. Can't be assigned.")
    }
    selectedTask.value = task
  }
}

async function handleAssignClick() {
  await taskStore.setTaskRequirement(selectedTask.value.id, props.requirementDetail.id)
}

const taskList = computed(() => {
  return taskStore.tasks?.filter((task) => task.requirement_detail_id)
})
</script>
<template>
  <div class="text-left p-4">
    <div class="flex items-center gap-6 justify-center my-16">
      <button @click.prevent="emit('parentIdSelect', 0, assignType)" class="btn-3">
        Add as Main Task
      </button>

      <button
        :class="{ 'btn-3': assignType !== 'sub-task', 'btn-2': assignType == 'sub-task' }"
        @click.prevent="
          () => {
            assignType = 'sub-task'
            selectedTask = null
          }
        "
      >
        Add as Sub Task
      </button>

      <button
        :class="{ 'btn-3': assignType !== 'direct-assign', 'btn-2': assignType == 'direct-assign' }"
        @click.prevent="() => (assignType = 'direct-assign')"
      >
        Assign Task
      </button>
    </div>

    <div v-if="assignType == 'direct-assign' && selectedTask">
      <div class="bg-blue-50 px-6 py-4 rounded text-blue-500">
        <div
          class="text-left text-base w-full font-semibold group flex items-center gap-2 mb-5 border-b border-blue-100 py-4"
        >
          <i
            class="fad text-xl group:hover-text-white"
            :class="
              selectedTask?.children_task_count > 0
                ? 'fa-folder text-blue-800/70'
                : 'fa-file-alt text-gray-400'
            "
          ></i>
          <div class="flex items-center w-full">
            <div class="grow">{{ selectedTask.title }}</div>
            <TaskStatus :status="selectedTask.status" class="ml-auto" />
          </div>
        </div>
        <div class="text-center text-red-500 text-sm font-semibold mb-4">{{ taskStore.error }}</div>
        <div class="flex items-center justify-between">
          <button @click.prevent="handleAssignClick" class="btn-2">Assign</button>
          <button @click.prevent="emit('cancelClick')" class="btn-3">Cancel</button>
        </div>
      </div>
    </div>

    <div class="border rounded-md" v-if="assignType && !selectedTask">
      <div class="py-2 px-4 font-bold text-center border-b shadow">Click to select task</div>
      <div class="flex flex-col justify-start items-start min-h-28 max-h-[70vh] overflow-y-auto">
        <div v-for="task in taskList" :key="task.id" class="w-full mb-2">
          <!-- Level 1 -->
          <button
            type="button"
            class="text-left text-base w-full bg-blue-50 px-2 hover:bg-blue-500 hover:text-white py-2 text-blue-500 font-semibold group flex items-center gap-2"
            @click.prevent="() => handleTaskClick(task)"
          >
            <i
              class="fad text-xl group:hover-text-white"
              :class="
                task?.children_task_count > 0
                  ? 'fa-folder text-blue-800/70'
                  : 'fa-file-alt text-gray-400'
              "
            />
            <div class="flex items-center w-full">
              <div class="grow">
                <div class="line-clamp-1">
                  {{ task.title }}
                </div>
                <div
                  class="text-red-400 text-xs font-normal mt-1"
                  v-if="!!task.requirement_detail_id && assignType == 'direct-assign'"
                >
                  Already assigned to a requirement
                </div>
              </div>
              <TaskStatus :status="task.status" class="ml-auto" />
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
