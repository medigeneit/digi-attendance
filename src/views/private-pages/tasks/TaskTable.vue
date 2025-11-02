<template>
  <div class="w-full p-1">
    <table class="w-full rounded-b" v-if="tasks?.length > 0">
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
        <template v-for="(requirement, requirementIndex) in requirements" :key="requirement.id">
          <tr class="group/dept">
            <th colspan="10" class="font-semibold" :class="[requirementIndex > 0 ? '' : '']">
              <div
                class="text-left -mx-[2px] -mb-[1px] py-2 px-2 flex items-center border border-b-0 rounded-t bg-emerald-50"
                :class="[
                  requirement.id === 0 ? 'text-gray-500' : 'text-sky-800',
                  requirementIndex > 0 ? 'mt-4' : '',
                  // requirement.id === 0 ? 'bg-gray-50' : 'bg-gray-50',
                ]"
              >
                <div class="flex gap-1 items-start text-base">
                  <div class="font-bold text-lime-600">{{ requirementIndex + 1 }}.</div>
                  <p v-if="requirement.id === 0">{{ requirement.title }}</p>
                  <RouterLink
                    v-else
                    :to="`requirements/show/${requirement.id}`"
                    class="line-clamp-2 hover:underline"
                  >
                    {{ requirement.title }}
                  </RouterLink>
                </div>

                <div class="ml-auto">
                  <button
                    v-if="route?.name == 'RequirementTaskList'"
                    @click="
                      emits(
                        'clickAddTask',
                        {
                          requirement_id: requirement?.id,
                          from_department_id: requirement?.from_department_id,
                          to_department_id: requirement?.to_department_id,
                        },
                        {
                          requirement_id: true,
                          from_department_id: true,
                          to_department_id: true,
                        },
                      )
                    "
                    class="btn-2 whitespace-nowrap h-6 px-3 opacity-20 group-hover/dept:opacity-100"
                  >
                    <i class="fas fa-plus-circle"></i>
                    Add Task
                  </button>
                </div>
              </div>
            </th>
          </tr>
          <tr
            v-for="(task, taskIndex) in requirement.tasks"
            :key="task.id"
            class="group/sub-task-row"
            :class="{
              ' bg-green-400/20': task.status == 'COMPLETED',
              ' bg-white hover:bg-slate-50': task.status !== 'COMPLETED',
            }"
          >
            <td class="border text-center py-2 px-1 border-gray-200">
              <div class="font-semibold text-purple-400 text-sm" v-if="taskIndex !== undefined">
                {{ requirementIndex + 1 }}.{{ taskIndex + 1 }}
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
                      :isMyTask="route.name == 'RequirementList'"
                      :to="taskLinkTo"
                    />
                  </div>

                  <div class="flex items-center flex-none lg:w-full order-0 lg:order-1">
                    <div class="text-gray-400 text-xs mr-4 whitespace-nowrap">
                      <i class="fas fa-clock"></i>
                      <span>{{ getDisplayDateTime(task.created_at) }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
                      <TaskImportantBadge v-if="task?.is_important" />
                      <TaskUrgentBadge v-if="task?.is_urgent" />
                    </div>
                    <div class="text-xs flex items-center gap-1 text-sky-400 ml-4">
                      <i class="fas fa-tasks"></i> {{ task?.todos_count }}
                    </div>
                    <div class="text-xs flex items-center gap-1 text-sky-400 ml-3">
                      <i class="fas fa-book"></i> {{ task?.requirement?.id }}
                    </div>
                  </div>
                </div>

                <a
                  :href="`/tasks/edit/${task.id}`"
                  @click.stop.prevent="emits('editClick', task.id)"
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
                  :users="task.users || []"
                  :isTargetTask="task.is_target"
                  :maxItem="1"
                  :route-to="
                    (user) =>
                      `/requirement-tasks?status=not-completed&view=userwise&user-ids=${user.id}`
                  "
                />
                <div class="shrink-0" v-if="!task.closed_at">
                  <a
                    :href="`/tasks/${task.id}/assign-users`"
                    @click.stop.prevent="emits('employeeAssignClick', task.id)"
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
import { useRoute } from 'vue-router'

const props = defineProps({
  tasks: { type: Array, required: true, default: () => [] },
  hideButtons: { type: Boolean, default: false },
  parentTreeLevel: { type: Number },
  maxItem: { Number, default: 5 },
  isMyTask: { type: Boolean, default: false },
  taskLinkTo: { type: Function, default: null },
})

const route = useRoute()

const requirements = computed(() => {
  return props.tasks
    .reduce((requirements, task) => {
      const key = task.requirement?.id || '-'

      const requirementList = [...requirements]

      const foundRequirement = requirementList.find((d) => d?.key == key)

      if (!foundRequirement) {
        requirementList.push({
          key: key,
          position: task?.requirement ? 0 : 1,
          ...(task?.requirement || { title: '(Other tasks)', id: 0 }),
          tasks: [task],
        })
      } else {
        foundRequirement.tasks = [...foundRequirement.tasks, task]
      }

      return requirementList
    }, [])
    .sort((requirementA, requirementB) => requirementA.position - requirementB.position)
})

// @editClick="(taskId) => (editingId = taskId)"

const emits = defineEmits(['editClick', 'addClick', 'employeeAssignClick', 'clickAddClick'])
</script>
