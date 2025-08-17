<template>
  <div class="-mx-3">
    <table class="w-full" v-if="childrenTasks?.length > 0">
      <thead>
        <tr>
          <td
            class="border-y text-center text-xs text-gray-400 bg-gray-50/80 w-[30px] sticky -top-4 z-20"
          >
            SL
          </td>
          <td class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20">
            Sub Task
          </td>
          <td class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20">
            Assign Person
          </td>
          <td class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20">
            Assign Date
          </td>
          <td class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20">
            Deadline
          </td>
          <td class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20">
            Started
          </td>
          <td class="border-y text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20">
            Status
          </td>
        </tr>
      </thead>
      <tbody>
        <template v-for="(task, index) in slicedTasks" :key="task.id">
          <tr
            class="group/sub-task-row"
            :class="{
              ' bg-green-400/20': task.status == 'COMPLETED',
              ' bg-white hover:bg-slate-50': task.status !== 'COMPLETED',
            }"
          >
            <td class="border-y text-center py-2 border-gray-200">
              <div class="text-base font-semibold text-purple-600" v-if="index !== undefined">
                {{ index + 1 }}.
              </div>
            </td>
            <td class="border px-3 py-1 border-gray-200 relative">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-3">
                    <TaskTitleRouterLink
                      titleClass="text-sm"
                      :task="task"
                      :sub-tasks-open="false"
                      :is-my-task="isMyTask"
                    />
                  </div>
                  <div class="flex items-center flex-none lg:w-full order-0 lg:order-1">
                    <!-- <span class="text-gray-500 text-sm"> #{{ task }} </span> -->
                    <div class="text-gray-400 text-xs mr-4 whitespace-nowrap">
                      <i class="fas fa-clock"></i>
                      {{ getDisplayDateTime(task.created_at) }}
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
                      <TaskImportantBadge v-if="task?.is_important" />
                      <TaskUrgentBadge v-if="task?.is_urgent" />
                    </div>
                  </div>
                </div>

                <a
                  :href="`/tasks/edit/${task.id}`"
                  @click.stop.prevent="emits('editClick', task.id)"
                  class="btn-3 py-1.5 px-1.5 !border-0 size-7 text-sm opacity-40 group-hover/sub-task-row:opacity-100 duration-100"
                  v-if="!task.is_closed && !hideButtons"
                >
                  <i class="fas fa-edit"></i>
                </a>
              </div>
            </td>
            <td class="border px-3 py-1 border-gray-200">
              <div class="flex gap-2 justify-between items-center relative w-full">
                <TaskAssignedUsers
                  class="flex items-center justify-center gap-x-3 gap-y-2"
                  :users="task.users || []"
                  :isTargetTask="task.is_target"
                  :maxItem="1"
                  :route-to="
                    (user) => `/tasks?status=not-completed&view=userwise&user-ids=${user.id}`
                  "
                />
                <div class="shrink-0">
                  <a
                    :href="`/tasks/${task.id}/assign-users`"
                    @click.stop.prevent="emits('employeeAssignClick', task.id)"
                    v-if="!task.is_closed && !hideButtons"
                    class="btn-3 py-1.5 px-1.5 !border-0 size-7 text-sm opacity-40 group-hover/sub-task-row:opacity-100 duration-100 flex-shrink-0"
                  >
                    <i class="fas fa-users-cog"></i>
                  </a>
                </div>
              </div>
            </td>
            <td class="border px-3 py-1 border-gray-200 text-center">
              <span class="text-gray-500 text-sm" v-if="task.assigned_at">
                <span class="font-semibold text-blue-800">{{
                  getDisplayDate(task.assigned_at)
                }}</span>
              </span>
            </td>
            <td class="border px-3 py-1 border-gray-200 text-center">
              <span class="ml-4 text-gray-500 text-sm" v-if="task.deadline">
                <span class="text-blue-500 font-semibold">{{ getDisplayDate(task.deadline) }}</span>
              </span>
            </td>
            <td class="border px-3 py-1 border-gray-200 text-center">
              <span class="text-gray-500 text-sm" v-if="task.started_at">
                <span class="font-semibold text-blue-800">{{
                  getDisplayDate(task.started_at)
                }}</span>
              </span>
            </td>
            <td class="border-y px-3 py-1 border-gray-200">
              <div class="flex justify-end gap-2">
                <TaskIsClosedBadge v-if="task.closed_at" />
                <TaskStatus :status="task?.status" :progressPercent="task?.progress_percent || 0" />
                <SubTaskProgress ref="progress" :task="task" class="text-sm" />
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    <div class="flex gap-1 items-center mt-2 mb-1 text-sm">
      <template v-if="childrenTasks.length > 0">
        <button
          class="hover:bg-blue-600 hover:text-white text-indigo-600 font-semibold px-3 py-0.5 rounded-full transition border ml-2"
          @click.prevent.stop="handleShowAllTask"
          v-if="hiddenTasks.length > 0 || showAll"
        >
          {{ showAll ? 'Hide' : 'Show' }} All
        </button>
        <span v-if="hiddenTasks.length > 0" class="text-red-800 italic">
          {{ hiddenTasks.length }} More sub task{{ hiddenTasks.length > 1 ? 's' : '' }}
        </span>
      </template>

      <a
        :href="`/tasks/add?parent_id=${parentTask.id}&back-to=${encodeURIComponent(route.path + '?' + objectToQuery(route.query)).toLowerCase()}`"
        class="hover:bg-blue-600 hover:text-white text-indigo-600 font-semibold px-3 py-0.5 rounded-full transition border border-indigo-300"
        :class="{ 'ml-2': childrenTasks.length === 0, 'ml-3': childrenTasks.length > 0 }"
        @click.stop.prevent="emits('addClick', parentTask.id)"
        v-if="parentTask.level < 2 && !hideButtons"
      >
        <i class="fas fa-plus"></i> Add Sub Task
      </a>
    </div>
  </div>
</template>

<script setup>
import { getDisplayDate, getDisplayDateTime } from '@/libs/datetime'
import { objectToQuery } from '@/libs/url'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import SubTaskProgress from './tasks/SubTaskProgress.vue'
import TaskAssignedUsers from './tasks/TaskAssignedUsers.vue'
import TaskImportantBadge from './tasks/TaskImportantBadge.vue'
import TaskIsClosedBadge from './tasks/TaskIsClosedBadge.vue'
import TaskStatus from './tasks/TaskStatus.vue'
import TaskTitleRouterLink from './tasks/TaskTitleRouterLink.vue'
import TaskUrgentBadge from './tasks/TaskUrgentBadge.vue'

const props = defineProps({
  childrenTasks: { type: Array, required: true, default: () => [] },
  parentTask: { type: Object },
  hideButtons: { type: Boolean, default: false },
  parentTreeLevel: { type: Number },
  maxItem: { Number, default: 5 },
})

const showAll = ref(false)

const route = useRoute()

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
