<template>
  <div class="w-full p-1">
    <table class="w-full" v-if="tasks?.length > 0">
      <thead>
        <tr>
          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 w-[30px] sticky -top-4 z-20"
          >
            SL
          </td>
          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20 px-2 whitespace-nowrap"
          >
            Task
          </td>
          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20 px-2 whitespace-nowrap"
          >
            Assign Person
          </td>

          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20 px-2 whitespace-nowrap"
          >
            Deadline
          </td>

          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 -top-4 z-20 sticky right-0 border-l bg-sky-50 px-2 whitespace-nowrap"
          >
            Status
          </td>
        </tr>
      </thead>
      <tbody>
        <template v-for="(detail, detailIndex) in requirementDetails" :key="detail.id">
          <tr class="" v-if="requirementDetails.length > 1">
            <th colspan="10" class="font-semibold border" :class="[detailIndex > 0 ? '' : '']">
              <div
                class="text-left pt-4 pb-1 px-2"
                :class="[
                  detail.id === 0 ? 'text-gray-500' : 'text-sky-800',
                  // detail.id === 0 ? 'bg-gray-50' : 'bg-gray-50',
                ]"
              >
                <div class="line-clamp-1">
                  {{ detail?.title }}
                </div>
              </div>
            </th>
          </tr>
          <tr
            v-for="(task, taskIndex) in detail.tasks"
            :key="task.id"
            class="group/sub-task-row"
            :class="{
              ' bg-green-400/20': task.status == 'COMPLETED',
              ' bg-white hover:bg-slate-50': task.status !== 'COMPLETED',
            }"
          >
            <td class="border text-center py-2 px-1 border-gray-200">
              <div class="text-base font-semibold text-purple-600" v-if="taskIndex !== undefined">
                {{ taskIndex + 1 }}.
              </div>
            </td>
            <td class="border px-3 py-1 border-gray-200 relative">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-3 mb-0.5">
                    <TaskTitleRouterLink
                      titleClass="text-sm"
                      :task="task"
                      :sub-tasks-open="false"
                      :isMyTask="isMyTask"
                      :to="taskLinkTo"
                    />
                  </div>

                  <div class="flex items-center flex-none lg:w-full order-0 lg:order-1">
                    <div class="text-gray-400 text-xs mr-4 whitespace-nowrap">
                      <i class="fas fa-clock"></i>
                      {{ getDisplayDateTime(task.created_at) }}
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
                      <TaskImportantBadge v-if="task?.is_important" />
                      <TaskUrgentBadge v-if="task?.is_urgent" />
                    </div>
                    <div class="text-xs flex items-center gap-1 text-sky-400 ml-2">
                      <i class="fas fa-tasks"></i> {{ task?.todos_count }}
                    </div>
                    <div class="text-xs flex items-center gap-1 text-sky-400 ml-2">
                      <i class="fas fa-book"></i> {{ task?.requirement_detail?.id }}
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
                    (user) =>
                      `/requirement-tasks?status=not-completed&view=userwise&user-ids=${user.id}`
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
              <span class="ml-4 text-gray-500 text-sm" v-if="task.deadline">
                <span class="text-blue-500 font-semibold whitespace-nowrap">
                  {{ getDisplayDate(task.deadline) }}
                </span>
              </span>
            </td>

            <td class="border px-3 border-gray-200 sticky right-0 border-l bg-sky-50">
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
      </tbody>
    </table>
  </div>
</template>

<script setup>
import SubTaskProgress from '@/components/tasks/SubTaskProgress.vue'
import TaskAssignedUsers from '@/components/tasks/TaskAssignedUsers.vue'
import TaskImportantBadge from '@/components/tasks/TaskImportantBadge.vue'
import TaskIsClosedBadge from '@/components/tasks/TaskIsClosedBadge.vue'
import TaskStatus from '@/components/tasks/TaskStatus.vue'
import TaskTitleRouterLink from '@/components/tasks/TaskTitleRouterLink.vue'
import TaskUrgentBadge from '@/components/tasks/TaskUrgentBadge.vue'
import { getDisplayDate, getDisplayDateTime } from '@/libs/datetime'
import { computed } from 'vue'

const props = defineProps({
  tasks: { type: Array, required: true, default: () => [] },
  hideButtons: { type: Boolean, default: false },
  parentTreeLevel: { type: Number },
  maxItem: { Number, default: 5 },
  isMyTask: { type: Boolean, default: false },
  taskLinkTo: { type: Function, default: null },
})

const requirementDetails = computed(() => {
  return props.tasks
    .reduce((details, task) => {
      const key = task.requirement_detail?.id || '-'

      const detailList = [...details]

      const foundDetail = detailList.find((d) => d?.key == key)

      if (!foundDetail) {
        detailList.push({
          key: key,
          position: task?.requirement_detail ? 0 : 1,
          ...(task?.requirement_detail || { title: '(Other tasks)', id: 0 }),
          tasks: [task],
        })
      } else {
        foundDetail.tasks = [...foundDetail.tasks, task]
      }

      return detailList
    }, [])
    .sort((detailA, detailB) => detailA.position - detailB.position)
})

// @editClick="(taskId) => (editingId = taskId)"

const emits = defineEmits(['editClick', 'addClick', 'employeeAssignClick'])
</script>
