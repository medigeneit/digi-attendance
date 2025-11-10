<script setup>
import { getDisplayDate, getDisplayDateTime } from '@/libs/datetime'
import { useRoute } from 'vue-router'
import SubTaskProgress from './SubTaskProgress.vue'
import TaskAssignedUsers from './TaskAssignedUsers.vue'
import TaskImportantBadge from './TaskImportantBadge.vue'
import TaskIsClosedBadge from './TaskIsClosedBadge.vue'
import TaskStatus from './TaskStatus.vue'
import TaskTitleRouterLink from './TaskTitleRouterLink.vue'
import TaskUrgentBadge from './TaskUrgentBadge.vue'

defineProps({
  task: { type: Object },
  indexing: { type: [Number, String] },
  hideButtons: { type: Boolean, default: false },
  taskLinkTo: { type: Function, default: null },
})

const emit = defineEmits(['editClick', 'employeeAssignClick'])

const route = useRoute()
</script>
<template>
  <tr
    class="group/sub-task-row h-20"
    :class="{
      ' bg-green-400/20': task.status == 'COMPLETED',
      ' bg-white hover:bg-slate-50': task.status !== 'COMPLETED',
    }"
  >
    <td class="border text-center py-2 px-1 border-gray-200">
      <div class="font-semibold text-purple-400 text-sm">
        {{ indexing }}
      </div>
    </td>
    <td class="border px-3 py-1 border-gray-200 relative">
      <div class="flex items-center justify-between gap-2">
        <div>
          <div class="flex items-center gap-3 mb-0.5">
            <TaskTitleRouterLink
              titleClass="text-sm text-blue-400 font-semibold"
              :task="task"
              :sub-tasks-open="false"
              :isMyTask="route.name == 'RequirementList'"
              :to="(task) => `/requirement-tasks/${task.id}`"
            />
            <!-- :to="(task) => (task ? { name: 'RequirementTaskShow', id: task.id } : null)" -->
          </div>

          <div class="flex items-center flex-none lg:w-full order-0 lg:order-1">
            <div class="text-gray-600 text-xs mr-2 whitespace-nowrap font-bold">{{ task.id }}</div>
            <div class="text-gray-400 text-xs mr-4 whitespace-nowrap">
              <i class="fas fa-clock"></i>
              <span class="ml-1">{{ getDisplayDateTime(task.created_at) }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
              <TaskImportantBadge v-if="task?.is_important" />
              <TaskUrgentBadge v-if="task?.is_urgent" />
            </div>

            <div
              class="text-xs flex items-center gap-1 text-sky-400 ml-4"
              v-if="task?.todo_dates_count === null"
            >
              <i class="fas fa-tasks"></i>
              <span>
                {{ task?.completed_todo_dates_count }}
              </span>
              <span>/</span>
              <span>
                {{ task?.todo_dates_count }}
              </span>
            </div>
          </div>
        </div>

        <a
          :href="`/tasks/edit/${task.id}`"
          @click.stop.prevent="emit('editClick', task.id)"
          class="btn-3 py-1.5 px-1.5 !border-0 size-7 text-sm opacity-40 group-hover/sub-task-row:opacity-100 duration-100"
          v-if="!task.closed_at && !hideButtons"
        >
          <i class="fas fa-edit"></i>
        </a>
      </div>
    </td>
    <td class="border px-3 py-1 border-gray-200">
      <div class="flex gap-2 justify-between items-center relative w-full">
        <TaskAssignedUsers
          class="flex items-center justify-center gap-x-3 gap-y-2"
          :users="task?.users || []"
          :isTargetTask="task.is_target"
          :maxItem="1"
          :route-to="
            (user) => `/requirement-tasks?status=not-completed&view=userwise&user-ids=${user.id}`
          "
        />
        <div class="shrink-0" v-if="!task.closed_at">
          <a
            :href="`/tasks/${task.id}/assign-users`"
            @click.stop.prevent="emit('employeeAssignClick', task.id)"
            v-if="!hideButtons"
            class="btn-3 py-1.5 px-1.5 !border-0 size-7 text-sm opacity-40 group-hover/sub-task-row:opacity-100 duration-100 flex-shrink-0"
          >
            <i class="fas fa-users-cog"></i>
          </a>
        </div>
      </div>
    </td>

    <td class="border px-3 py-1 border-gray-200 text-center">
      <span class="ml-4 text-gray-500 text-sm" v-if="task.deadline">
        <span class="text-blue-500 font-semibold whitespace-nowrap">
          {{ getDisplayDate(task.deadline) }}
        </span>
      </span>
    </td>

    <td class="border px-3 border-gray-200 sticky right-0 border-l bg-gray-50">
      <div class="flex justify-end flex-wrap gap-2 py-2">
        <TaskIsClosedBadge v-if="task.closed_at" />
        <TaskStatus
          :status="task?.status"
          :progressPercent="task?.progress_percent || 0"
          class="w-full"
        />
        <SubTaskProgress
          ref="progress"
          :task="task"
          class="text-sm w-full"
          v-if="task?.children_tasks?.length > 0"
        />
      </div>
    </td>
  </tr>
</template>
