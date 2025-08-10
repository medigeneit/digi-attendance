<template>
  <div class="mt-3">
    <table class="w-full">
      <tbody>
        <template v-for="(task, index) in slicedTasks" :key="task.id">
          <tr
            class=""
            :class="{
              ' bg-green-100/50': task.status == 'COMPLETED',
              ' bg-white hover:bg-gray-100/60': task.status !== 'COMPLETED',
            }"
          >
            <td class="border-y border-l w-10 px-4 py-2">
              <div class="text-xl font-semibold text-blue-500" v-if="index !== undefined">
                {{ index + 1 }}
              </div>
            </td>
            <td class="border-y px-2 py-2">
              <div class="mb-1">
                <TaskTitleRouterLink :task="task" :sub-tasks-open="false" :is-my-task="isMyTask" />
              </div>
              <div class="flex items-center flex-none lg:w-full order-0 lg:order-1 mb-2">
                <!-- <span class="text-gray-500 text-sm"> #{{ task }} </span> -->
                <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
                  <TaskImportantBadge v-if="task?.is_important" />
                  <TaskUrgentBadge v-if="task?.is_urgent" />
                </div>
              </div>

              <div class="text-gray-400 text-xs col-span-full">
                <i class="fas fa-clock"></i>
                {{ getDisplayDateTime(task.created_at) }}
              </div>
            </td>
            <td class="border-y border-r px-2 py-2">
              <div class="flex justify-end gap-2">
                <TaskIsClosedBadge v-if="task.closed_at" />
                <TaskStatus :status="task?.status" :progressPercent="task?.progress_percent || 0" />
                <SubTaskProgress ref="progress" :task="task" class="text-sm" />
              </div>
            </td>
          </tr>
        </template>
        <tr v-if="childrenTasks.length > 0">
          <td colspan="10" class="py-1">
            <div class="text-center">
              <span v-if="hiddenTasks.length > 0" class="text-gray-500">
                {{ hiddenTasks.length }} More tasks
              </span>
              <button
                class="hover:bg-blue-600 hover:text-white text-indigo-600 font-semibold px-3 py-0.5 rounded-full transition border border-transparent"
                @click.prevent.stop="handleShowAllTask"
                v-if="hiddenTasks.length > 0 || showAll"
              >
                {{ showAll ? 'Hide' : 'Show' }} All
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { getDisplayDateTime } from '@/libs/datetime'
import { computed, ref } from 'vue'
import SubTaskProgress from './tasks/SubTaskProgress.vue'
import TaskImportantBadge from './tasks/TaskImportantBadge.vue'
import TaskIsClosedBadge from './tasks/TaskIsClosedBadge.vue'
import TaskStatus from './tasks/TaskStatus.vue'
import TaskTitleRouterLink from './tasks/TaskTitleRouterLink.vue'
import TaskUrgentBadge from './tasks/TaskUrgentBadge.vue'

const props = defineProps({
  childrenTasks: { type: Array, required: true, default: () => [] },
  hideButtons: { type: Boolean, default: false },
  parentTreeLevel: { type: Number },
  maxItem: { Number, default: 2 },
})

const showAll = ref(false)

const slicedTasks = computed(() => {
  if (showAll.value) {
    return props.childrenTasks
  }
  return props.childrenTasks.slice(0, props.maxItem)
})

const hiddenTasks = computed(() => {
  if (showAll.value) {
    return []
  }
  return props.childrenTasks.slice(props.maxItem)
})

function handleShowAllTask() {
  showAll.value = !showAll.value
}

// @editClick="(taskId) => (editingId = taskId)"

const emits = defineEmits(['editClick', 'addClick', 'employeeAssignClick'])
</script>
