<template>
  <div class="mt-3 -mx-3">
    <table class="w-full">
      <tbody>
        <template v-for="(task, index) in slicedTasks" :key="task.id">
          <tr
            class=""
            :class="{
              ' bg-lime-400/20': task.status == 'COMPLETED',
              ' bg-white hover:bg-slate-50': task.status !== 'COMPLETED',
            }"
          >
            <td class="border-y pr-2 pl-8 py-4 border-gray-300">
              <div class="mb-1 flex items-center gap-3">
                <div class="text-base font-semibold text-purple-600" v-if="index !== undefined">
                  {{ index + 1 }}.
                </div>
                <TaskTitleRouterLink
                  titleClass="text-sm"
                  :task="task"
                  :sub-tasks-open="false"
                  :is-my-task="isMyTask"
                />
              </div>
              <div class="flex items-center flex-none lg:w-full order-0 lg:order-1 mb-2">
                <!-- <span class="text-gray-500 text-sm"> #{{ task }} </span> -->
                <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
                  <TaskImportantBadge v-if="task?.is_important" />
                  <TaskUrgentBadge v-if="task?.is_urgent" />
                </div>
              </div>

              <div class="text-gray-400 text-xs">
                <i class="fas fa-clock"></i>
                {{ getDisplayDateTime(task.created_at) }}
              </div>
            </td>
            <td class="border-y px-2 py-4 border-gray-300">
              <div class="flex">
                <TaskAssignedUsers
                  class="flex items-center justify-center flex-wrap gap-x-3 gap-y-2"
                  :users="task.users || []"
                  :isTargetTask="task.is_target"
                  :maxItem="1"
                />
              </div>
            </td>
            <td class="border-y py-4 pl-2 pr-4 border-gray-300">
              <div class="flex justify-end gap-2">
                <TaskIsClosedBadge v-if="task.closed_at" />
                <TaskStatus :status="task?.status" :progressPercent="task?.progress_percent || 0" />
                <SubTaskProgress ref="progress" :task="task" class="text-sm" />
              </div>
            </td>
          </tr>
        </template>
        <tr v-if="childrenTasks.length > 0">
          <td colspan="10" class="py-2 px-8">
            <div class="text-sm">
              <span v-if="hiddenTasks.length > 0" class="text-red-800 italic">
                {{ hiddenTasks.length }} More sub task{{ hiddenTasks.length > 1 ? 's' : '' }}
              </span>
              <button
                class="hover:bg-blue-600 hover:text-white text-indigo-600 font-semibold px-3 py-0.5 rounded-full transition border border-transparent ml-2"
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
import TaskAssignedUsers from './tasks/TaskAssignedUsers.vue'
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
