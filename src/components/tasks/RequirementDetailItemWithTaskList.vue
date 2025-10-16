taskAddClick
<script setup>
import { getDisplayDateTime } from '@/libs/datetime.js'
import { ref, watch } from 'vue'
import DepartmentChip from '../DepartmentChip.vue'
import TaskTreeChildrenTable from '../TaskTreeChildrenTable.vue'

const props = defineProps({
  detail: { type: Object, required: true },
  hideButtons: { type: Boolean, default: false },
  hideAssignedUsers: { type: Boolean, default: false },
  treeLevel: { type: Number, default: 0 },
  showDraggableHandle: { Boolean, default: false },
  isMyTask: { Boolean, default: false },
  index: { type: Number, default: 0 },
})

const emits = defineEmits([
  'commentButtonClick',
  'editClick',
  'taskAddClick',
  'employeeAssignClick',
])

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

// Sync back to localStorage when it changes
watch(
  subTaskOpenedList,
  (newVal) => {
    localStorage.setItem('sub_task_opened_list', JSON.stringify(newVal))
  },
  { deep: true },
)
</script>
<template>
  <div
    class="flex w-full text-gray-800 bg-white border mb-5 rounded-md shadow"
    :class="{
      'border-blue-500': index % 2 === 0,
      'border-purple-500': index % 2 === 1,
    }"
  >
    <div class="flex-grow rounded overflow-y-auto">
      <div class="items-start group">
        <div
          class="task-details py-3 shadow-slate-100 flex flex-wrap z-30 pl-3"
          :class="{
            'shadow-sm': treeLevel > 0,
          }"
        >
          <div class="flex items-start justify-between w-full gap-4">
            <div class="flex gap-2 flex-grow items-center">
              <div class="text-xl font-semibold text-blue-500" v-if="index !== undefined">
                {{ index + 1 }}.
              </div>

              <div class="font-semibold text-blue-800 line-clamp-1">
                {{ detail.title }}
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-16 w-full">
            <div class="flex-shrink-0 flex items-center gap-6">
              <!-- {{ detail }} -->
              <div class="flex items-center gap-2 text-xs text-gray-500 opacity-80 text-left">
                <div class="text-xs text-gray-400 whitespace-nowrap">
                  <i class="fas fa-clock"></i>
                  {{ getDisplayDateTime(detail?.requirement?.submission_date) }}
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">From</span>
                <DepartmentChip :department="detail.requirement?.from_department" />
                <span class="text-sm text-gray-600">To</span>
                <DepartmentChip :department="detail.requirement?.to_department" />
              </div>
            </div>
          </div>
        </div>

        <div class="ml-0 col-span-full">
          <TaskTreeChildrenTable
            :childrenTasks="detail.tasks"
            :parentTask="{}"
            :isMyTask="isMyTask"
            :hide-buttons="hideButtons"
            :hide-assigned-users="hideAssignedUsers"
            :parent-tree-level="treeLevel"
            @editClick="handleChildEditClick"
            @employeeAssignClick="handleChildEmployeeAssignClick"
            class="*:mb-0"
          >
            <template #tree-item-end="{ task, level }">
              <slot name="item-end" :level="level" :task="task"></slot>
            </template>
          </TaskTreeChildrenTable>
        </div>
      </div>
    </div>
  </div>
</template>
