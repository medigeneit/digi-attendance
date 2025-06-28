<template>
  <div class="flex w-full">
    <div v-if="treeLevel > 0" class="border-l border-gray-200 last:border-l-0">
      <div
        class="border-l border-b w-4 rounded-bl-full border-gray-200 h-4/6 ml-[-1px] mt-[-30px]"
      ></div>
    </div>
    <div
      class="flex-grow border rounded py-3 px-3"
      :class="{
        'bg-green-100  ': progress?.completedPercentage === 100,
        'bg-white hover:bg-gray-50': progress?.completedPercentage < 100,
        'shadow-sm': treeLevel > 0,
      }"
    >
      <div class="items-start grid grid-cols-3 group">
        <div>
          <div>
            <div class="flex gap-4 items-center">
              <div class="text-xl font-semibold text-sky-500" v-if="index !== undefined">
                {{ index + 1 }}
              </div>
              <button @mousedown.stop="handleDragging" class="handle" v-if="showDraggableHandle">
                <i class="fas fa-arrows-alt text-gray-500 cursor-grab"></i>
              </button>
              <span class="text-gray-500 text-sm"> #{{ task.id }} </span>

              <div class="text-red-500 text-2xl">{{ treeLevel }}</div>
            </div>

            <div class="flex items-center gap-2">
              <TaskTitleRouterLink :task="task" />
            </div>
          </div>

          <p class="text-sm text-gray-500 mt-2" v-if="task?.requirement">
            Requirement: {{ task?.requirement?.title }}
          </p>

          <div class="flex items-center gap-2 text-xs text-gray-500 mt-2 opacity-80 text-left">
            <TaskImportantBadge v-if="task?.is_important" />
            <TaskUrgentBadge v-if="task?.is_urgent" />
          </div>
        </div>

        <div class="flex items-center flex-wrap gap-3">
          <RouterLink
            v-for="(item, index) in task.users"
            :key="index"
            :to="{
              name: 'TaskList',
              query: {
                ...route.query,
                view: 'userwise',
                'company-id': item.company_id,
                'user-ids': item.id,
              },
            }"
          >
            <UserChip
              class="flex items-center gap-2 border rounded-full px-1 py-0.5 shadow-sm"
              :class="{ '!bg-yellow-400': task?.is_target }"
              :user="item"
            />
          </RouterLink>

          <div v-if="task.users.length === 0" class="text-gray-500 text-xs">
            Not Assigned To Anyone
          </div>
          <RouterLink
            :to="{ name: 'TaskUserAssign', params: { id: task?.id } }"
            title="Assign user"
            class="border-gray-400 bg-gray-50 text-gray-500 hover:bg-indigo-600 hover:text-white font-semibold px-3 py-0.5 rounded-full transition border"
          >
            <i class="fas fa-user-plus"></i>
          </RouterLink>
        </div>

        <div class="flex justify-end items-center gap-2">
          <span
            class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200"
            >{{ task.status }}</span
          >
          <SubTaskProgress :task="task" ref="progress" class="text-sm" />
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-center">
          <div class="flex gap-3 items-center">
            <div class="text-xs text-gray-500 flex gap-3">
              <button
                :class="{
                  'text-yellow-600 font-semibold  inline-block animate-bounce': hasSubTask,
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

              <a
                :href="`/tasks/add?parent_id=${props.task.id}`"
                class="hover:bg-indigo-600 hover:text-white text-indigo-600 font-semibold px-3 py-0.5 rounded-full transition border border-transparent"
                @click.stop.prevent="emits('addClick', props.task.id)"
                v-if="treeLevel < 2"
              >
                <i class="fas fa-plus"></i> Add Sub Task
              </a>
            </div>
          </div>

          <div class="ml-auto text-right text-sm flex items-center gap-4">
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

          <div class="flex gap-2 ml-4 items-center text-xs" v-if="!hideButtons">
            <a
              :href="`/tasks/edit/${task.id}`"
              @click.stop.prevent="emits('editClick', task.id)"
              class="btn-2 py-0.5 text-xs"
            >
              <i class="fas fa-edit"></i> Edit
            </a>

            <RouterLink
              :to="{ name: 'TaskReports', params: { id: task?.id } }"
              class="border-indigo-500 hover:bg-indigo-600 text-indigo-600 hover:text-white font-semibold px-3 py-0.5 rounded-full transition border-2"
            >
              <i class="far fa-file-alt"></i> Reports
            </RouterLink>
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
import UserChip from '@/components/user/UserChip.vue'
import { getDisplayDate } from '@/libs/datetime.js'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TaskImportantBadge from './tasks/TaskImportantBadge.vue'
import TaskTitleRouterLink from './tasks/TaskTitleRouterLink.vue'
import TaskUrgentBadge from './tasks/TaskUrgentBadge.vue'

const props = defineProps({
  task: { type: Object, required: true },
  hideButtons: { type: Boolean, default: false },
  treeLevel: { type: Number, default: 0 },
  showDraggableHandle: { Boolean, default: false },
  index: { type: Number },
})

const route = useRoute()

const progress = ref(null)

const emits = defineEmits(['commentButtonClick', 'editClick', 'addClick'])

function handleChildAddClick(taskId) {
  emits('addClick', taskId)
}

function handleChildEditClick(taskId) {
  emits('editClick', taskId)
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

// const priorityColor = (priority) => {
//   switch (priority) {
//     case 'HIGH':
//       return 'border-red-500 text-red-500'
//     case 'MEDIUM':
//       return 'border-yellow-500 text-yellow-500'
//     default:
//       return 'border-gray-300 text-gray-500'
//   }
// }

function handleSubTaskClick() {
  if (props.task.children_tasks.length > 0) {
    showSubTask.value = !showSubTask.value
  }
}
</script>
