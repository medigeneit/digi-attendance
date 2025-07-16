<template>
  <div class="flex w-full">
    <div v-if="treeLevel > 0" class="border-l border-gray-200 last:border-l-0">
      <div
        class="border-l border-b w-4 rounded-bl-full border-gray-200 h-4/6 ml-[-1px] mt-[-30px]"
      ></div>
    </div>

    <div
      class="flex-grow border-2 rounded py-3 px-3"
      :class="{
        'bg-blue-100/30  ': task.closed_at,
        'bg-green-100  ': progress?.completedPercentage === 100,
        'bg-white hover:bg-gray-50': progress?.completedPercentage < 100 && !task.closed_at,
        'shadow-sm': treeLevel > 0,
        'border-sky-500': index % 2 === 0,
        'border-pink-300': index % 2 === 1,
      }"
    >
      <div class="items-start grid grid-cols-4 gap-4 group">
        <div class="col-span-full md:col-span-full pb-3 border-b -mx-3 px-3 flex flex-wrap">
          <div
            class="flex items-center gap-2 w-full lg:w-auto mb-3 lg:mb-0 whitespace-break-spaces"
          >
            <div class="text-xl font-semibold text-sky-500" v-if="index !== undefined">
              {{ index + 1 }}.
            </div>

            <TaskTitleRouterLink
              :task="task"
              :sub-tasks-open="showSubTask"
              :is-my-task="isMyTask"
            />

            <p class="text-sm text-gray-500 mt-2" v-if="task?.requirement">
              Requirement: {{ task?.requirement?.title }}
            </p>
          </div>

          <div class="justify-end items-center gap-2 ml-auto flex order-1 lg:order-0">
            <div
              v-if="task.closed_at"
              class="border rounded-full px-2 bg-blue-500/60 text-white flex items-center text-sm"
            >
              <i class="fas fa-lock mr-2 text-sm"></i>CLOSED
            </div>

            <TaskStatus :status="task?.status" :progressPercent="task?.progress_percent || 0" />

            <SubTaskProgress ref="progress" :task="task" class="text-sm" />
          </div>

          <div class="flex items-center gap-6 flex-none lg:w-full order-0 lg:order-1">
            <div class="flex gap-4 items-center">
              <button @mousedown.stop="handleDragging" class="handle" v-if="showDraggableHandle">
                <i class="fas fa-arrows-alt text-gray-500 cursor-grab"></i>
              </button>

              <span class="text-gray-500 text-sm"> #{{ task.id }} </span>

              <div
                class="text-green-500 bg-green-50 text-[10px] px-[5px] py-[1px] rounded-full border border-green-200"
                v-if="treeLevel === 0"
              >
                Main
              </div>
            </div>

            <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
              <TaskImportantBadge v-if="task?.is_important" />
              <TaskUrgentBadge v-if="task?.is_urgent" />
            </div>
          </div>
        </div>

        <TaskSupervisorAndEmployee
          :task="task"
          :tree-level="treeLevel"
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
      </div>

      <div
        class="ml-auto text-right text-sm flex items-center justify-center sm:justify-start gap-4 mt-4"
      >
        <div v-if="task.is_target" class="bg-yellow-200 px-2 py-0.5 rounded-lg text-yellow-900">
          TARGET TASK
        </div>

        <span class="text-gray-500" v-if="startedDate">
          Started: <span class="font-semibold text-green-800">{{ startedDate }}</span>
        </span>
        <span class="ml-4 text-gray-500" v-if="deadline">
          Deadline: <span class="text-red-500 font-semibold">{{ deadline }}</span>
        </span>
      </div>

      <div class="mt-4 col-span-full">
        <div class="flex flex-col sm:flex-row gap-3 items-center mt-4 w-full">
          <div class="text-xs text-gray-500 flex gap-3 order-1 sm:order-0">
            <button
              :class="{
                'text-yellow-600 font-semibold  inline-block  ': hasSubTask,
              }"
              class="flex items-center gap-1 group"
              @click="handleSubTaskClick"
            >
              <i
                :class="showSubTask ? 'fa-caret-down' : 'fa-caret-right'"
                class="fas w-3 text-left text-xl"
              ></i>
              <span :class="hasSubTask ? 'group-hover:underline' : ''">
                Sub Tasks ({{ task.children_tasks?.length }})
              </span>
            </button>

            <template v-if="!task.closed_at">
              <a
                :href="`/tasks/add?parent_id=${props.task.id}&back-to=${encodeURIComponent(route.path + '?' + objectToQuery(route.query)).toLowerCase()}`"
                class="hover:bg-indigo-600 hover:text-white text-indigo-600 font-semibold px-3 py-0.5 rounded-full transition border border-transparent"
                @click.stop.prevent="emits('addClick', props.task.id)"
                v-if="treeLevel < 2"
              >
                <i class="fas fa-plus"></i> Add Sub Task
              </a>
            </template>
          </div>

          <div class="flex items-center sm:ml-auto order-0 sm:order-1">
            <div class="flex gap-2 ml-4 items-center text-xs" v-if="!hideButtons">
              <a
                :href="`/tasks/edit/${task.id}`"
                @click.stop.prevent="emits('editClick', task.id)"
                class="btn-2 py-0.5 text-xs"
              >
                <i class="fas fa-edit"></i> Edit
              </a>
              <a
                :href="`/tasks/${task.id}/assign-users`"
                @click.stop.prevent="emits('employeeAssignClick', task.id)"
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

        <div class="ml-0">
          <TaskTreeChildren
            v-if="showSubTask"
            :childrenTasks="task.children_tasks"
            :hide-buttons="hideButtons"
            :parent-tree-level="treeLevel"
            @editClick="handleChildEditClick"
            @addClick="handleChildAddClick"
            @employeeAssignClick="handleChildEmployeeAssignClick"
          >
            <template #tree-item-end="{ task, level }">
              <slot name="item-end" :level="level" :task="task"></slot>
            </template>
          </TaskTreeChildren>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import TaskTreeChildren from '@/components/TaskTreeChildren.vue'
import SubTaskProgress from '@/components/tasks/SubTaskProgress.vue'
import TaskStatus from '@/components/tasks/TaskStatus.vue'
import { getDisplayDate } from '@/libs/datetime.js'
import { objectToQuery } from '@/libs/url'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TaskImportantBadge from './tasks/TaskImportantBadge.vue'
import TaskSupervisorAndEmployee from './tasks/TaskSupervisorAndEmployee.vue'
import TaskTitleRouterLink from './tasks/TaskTitleRouterLink.vue'
import TaskUrgentBadge from './tasks/TaskUrgentBadge.vue'

const props = defineProps({
  task: { type: Object, required: true },
  hideButtons: { type: Boolean, default: false },
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

const startedDate = computed(() => getDisplayDate(props.task.started_at))
const deadline = computed(() => getDisplayDate(props.task.deadline))

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

function handleSubTaskClick() {
  if (props.task.children_tasks.length > 0) {
    showSubTask.value = !showSubTask.value
  }
}
</script>
