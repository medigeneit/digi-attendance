<template>
  <div class="flex w-full text-gray-800 bg-white">
    <div v-if="treeLevel > 0" class="border-l border-gray-200 last:border-l-0">
      <div
        class="border-l border-b w-4 rounded-bl-full border-gray-200 h-4/6 ml-[-1px] mt-[-30px]"
      ></div>
    </div>

    <div
      class="flex-grow border-2 rounded pb-3 px-3"
      :class="{
        'border-blue-500': index % 2 === 0,
        'border-pink-300': index % 2 === 1,
      }"
    >
      <div class="items-start grid grid-cols-4 gap-4 group">
        <div
          class="col-span-full md:col-span-full border-b -mx-3 px-3 pt-3 shadow-md shadow-slate-100 flex flex-wrap z-30"
          :class="{
            'bg-blue-100/30  ': task.closed_at,
            'bg-green-100  ': progress?.completedPercentage === 100,
            'bg-white hover:bg-gray-50': progress?.completedPercentage < 100 && !task.closed_at,
            'shadow-sm': treeLevel > 0,
          }"
        >
          <div class="flex items-start gap-6 w-full pb-4">
            <div class="flex-grow w-6/12">
              <div class="flex gap-2">
                <div class="text-xl font-semibold text-blue-500" v-if="index !== undefined">
                  {{ index + 1 }}.
                </div>

                <TaskTitleRouterLink
                  :task="task"
                  :sub-tasks-open="showSubTask"
                  :is-my-task="isMyTask"
                  class="whitespace-nowrap"
                />
              </div>
              <div class="flex items-center mb-2">
                <div class="flex gap-4 items-center mr-3" v-if="showDraggableHandle || task.serial">
                  <button
                    @mousedown.stop="handleDragging"
                    class="handle"
                    v-if="showDraggableHandle"
                  >
                    <i class="fas fa-arrows-alt text-gray-500 cursor-grab"></i>
                  </button>

                  <span class="text-gray-500 text-sm" v-if="task.serial"> #{{ task.serial }} </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
                  <div
                    class="text-white bg-blue-700 text-[12px] uppercase px-[5px] py-[1px] rounded-full border border-green-200 opacity-80"
                    v-if="treeLevel === 0"
                  >
                    Main
                  </div>
                  <TaskImportantBadge v-if="task?.is_important" class="flex-none" />
                  <TaskUrgentBadge v-if="task?.is_urgent" class="flex-none" />
                </div>
              </div>
              <div class="text-xs text-gray-400 whitespace-nowrap">
                <i class="fas fa-clock"></i>
                {{ getDisplayDateTime(task.created_at) }}
              </div>
            </div>

            <TaskSupervisorAndEmployee
              v-if="!hideAssignedUsers"
              :task="task"
              :tree-level="treeLevel"
              class="flex-nowrap w-1/2"
              :employee-route-to="
                (user) => ({
                  query: {
                    ...route.query,
                    view: 'userwise',
                    'company-id': user.company_id,
                    'user-ids': user.id,
                  },
                })
              "
            />

            <div class="justify-end items-center gap-2 ml-auto flex flex-wrap w-[350px]">
              <TaskIsClosedBadge v-if="task.closed_at" />

              <TaskStatus
                :status="task?.status"
                :progressPercent="task?.progress_percent || 0"
                class="w-[150px] text-center !border-2"
              />

              <SubTaskProgress ref="progress" :task="task" class="text-sm w-[150px] text-center" />
            </div>
          </div>
        </div>
        <div class="text-gray-400 text-xs col-span-full flex justify-between">
          <div class="ml-auto flex flex-wrap gap-2 mb-2 items-start">
            <div
              class="border bg-gray-50 text-xs px-2 rounded-lg shadow-sm text-gray-700 bg-gradient-to-b to-slate-50 from-blue-100"
              v-for="tag in task.website_tags || []"
              :key="tag.id"
            >
              {{ tag.name }}
            </div>
          </div>
        </div>

        <div class="ml-0 col-span-full">
          <div :class="{ 'ml-6': hasSubTask }">
            <div class="text-xs text-gray-400 flex gap-3 sm:order-0">
              <h2
                :class="{
                  'text-blue-600 font-semibold  inline-block  ': hasSubTask,
                }"
                class="flex items-center gap-1 group"
              >
                <!-- @click="handleSubTaskClick" -->
                <!-- <i
                  :class="showSubTask ? 'fa-caret-down' : 'fa-caret-right'"
                  class="fas w-3 text-left text-xl"
                ></i> -->
                <span> Sub Tasks ({{ task.children_tasks?.length }}) </span>
              </h2>

              <template v-if="!task.closed_at && !hideButtons">
                <a
                  :href="`/tasks/add?parent_id=${props.task.id}&back-to=${encodeURIComponent(route.path + '?' + objectToQuery(route.query)).toLowerCase()}`"
                  class="hover:bg-blue-600 hover:text-white text-indigo-600 font-semibold px-3 py-0.5 rounded-full transition border border-transparent"
                  @click.stop.prevent="emits('addClick', props.task.id)"
                  v-if="treeLevel < 2"
                >
                  <i class="fas fa-plus"></i> Add Sub Task
                </a>
              </template>
            </div>
          </div>
          <TaskTreeChildrenTable
            :childrenTasks="task.children_tasks"
            :hide-buttons="hideButtons"
            :hide-assigned-users="hideAssignedUsers"
            :parent-tree-level="treeLevel"
            @editClick="handleChildEditClick"
            @addClick="handleChildAddClick"
            @employeeAssignClick="handleChildEmployeeAssignClick"
          >
            <template #tree-item-end="{ task, level }">
              <slot name="item-end" :level="level" :task="task"></slot>
            </template>
          </TaskTreeChildrenTable>
        </div>
      </div>

      <div class="mt-2 col-span-full">
        <div class="flex gap-3 items-end">
          <div class="text-right text-sm flex gap-4 mt-4 opacity-80">
            <div v-if="task.is_target" class="bg-yellow-200 px-2 py-0.5 rounded-lg text-yellow-900">
              <i class="fad fa-bullseye-arrow mr-1"></i> TARGET TASK
            </div>

            <span class="text-gray-500 text-sm" v-if="assignedDate">
              Assign: <span class="font-semibold text-blue-800">{{ assignedDate }}</span>
            </span>

            <span class="ml-4 text-gray-500 text-sm" v-if="deadline">
              Deadline: <span class="text-blue-500 font-semibold">{{ deadline }}</span>
            </span>

            <span class="text-gray-500 text-sm" v-if="startedDate">
              Started: <span class="font-semibold text-blue-800">{{ startedDate }}</span>
            </span>
            <span class="text-gray-500 text-sm" v-if="completedDate">
              Completed: <span class="font-semibold text-blue-800">{{ completedDate }}</span>
            </span>
          </div>

          <div class="flex items-center sm:ml-auto order-0 sm:order-1">
            <div class="flex gap-2 ml-4 items-center text-xs" v-if="!hideButtons">
              <a
                :href="`/tasks/edit/${task.id}`"
                @click.stop.prevent="emits('editClick', task.id)"
                class="btn-2 py-0.5 text-xs"
                v-if="!task.is_closed"
              >
                <i class="fas fa-edit"></i> Edit
              </a>
              <a
                :href="`/tasks/${task.id}/assign-users`"
                @click.stop.prevent="emits('employeeAssignClick', task.id)"
                v-if="!task.is_closed"
                class="border-indigo-500 hover:bg-indigo-600 text-indigo-600 hover:text-white font-semibold px-3 py-0.5 rounded-full transition border-2"
              >
                <i class="fas fa-users-cog"></i> Manage Employee & Supervisor
              </a>

              <RouterLink
                :to="{ name: 'TaskReports', params: { id: task?.id } }"
                class="border-indigo-500 hover:bg-indigo-600 text-indigo-600 hover:text-white font-semibold px-3 py-0.5 rounded-full transition border-2"
              >
                <i class="far fa-file-alt"></i> Reports
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SubTaskProgress from '@/components/tasks/SubTaskProgress.vue'
import TaskStatus from '@/components/tasks/TaskStatus.vue'
import { getDisplayDate, getDisplayDateTime } from '@/libs/datetime.js'
import { objectToQuery } from '@/libs/url'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TaskTreeChildrenTable from '../TaskTreeChildrenTable.vue'
import TaskImportantBadge from './TaskImportantBadge.vue'
import TaskIsClosedBadge from './TaskIsClosedBadge.vue'
import TaskSupervisorAndEmployee from './TaskSupervisorAndEmployee.vue'
import TaskTitleRouterLink from './TaskTitleRouterLink.vue'
import TaskUrgentBadge from './TaskUrgentBadge.vue'
// import TaskImportantBadge from './tasks/TaskImportantBadge.vue'
// import TaskSupervisorAndEmployee from './tasks/TaskSupervisorAndEmployee.vue'
// import TaskTitleRouterLink from './tasks/TaskTitleRouterLink.vue'
// import TaskUrgentBadge from './tasks/TaskUrgentBadge.vue'

const props = defineProps({
  task: { type: Object, required: true },
  hideButtons: { type: Boolean, default: false },
  hideAssignedUsers: { type: Boolean, default: false },
  treeLevel: { type: Number, default: 0 },
  showDraggableHandle: { Boolean, default: false },
  isMyTask: { Boolean, default: false },
  index: { type: Number },
})

const route = useRoute()

const progress = ref(null)

const emits = defineEmits(['commentButtonClick', 'editClick', 'addClick', 'employeeAssignClick'])

function handleChildAddClick(taskId) {
  emits('addClick', taskId)
}

function handleChildEditClick(taskId) {
  emits('editClick', taskId)
}

function handleChildEmployeeAssignClick(taskId) {
  emits('employeeAssignClick', taskId)
}

const subTaskOpenedList = ref([])

// Initialize from localStorage once
const stored = localStorage.getItem('sub_task_opened_list')
if (stored) {
  try {
    subTaskOpenedList.value = JSON.parse(stored)
  } catch (e) {
    subTaskOpenedList.value = []
  }
}

const assignedDate = computed(() => getDisplayDate(props.task.assigned_at || props.task.created_at))
const deadline = computed(() => getDisplayDate(props.task.deadline))
const startedDate = computed(() => getDisplayDate(props.task.started_at))
const completedDate = computed(() => getDisplayDate(props.task.completed_at))

const showSubTask = computed({
  get: () => {
    return subTaskOpenedList.value.includes(props.task.id)
  },
  set: (value) => {
    const exists = subTaskOpenedList.value.includes(props.task.id)
    if (value && !exists) {
      subTaskOpenedList.value.push(props.task.id)
    } else if (!value && exists) {
      subTaskOpenedList.value = subTaskOpenedList.value.filter((id) => id !== props.task.id)
    }
  },
})

// Sync back to localStorage when it changes
watch(
  subTaskOpenedList,
  (newVal) => {
    localStorage.setItem('sub_task_opened_list', JSON.stringify(newVal))
  },
  { deep: true },
)

const hasSubTask = computed(() => {
  return props.task?.children_tasks?.length > 0
})
</script>
