<script setup>
import OverlyModal from '@/components/common/OverlyModal.vue'
import TaskUserDateUpdate from '@/components/tasks/TaskUserDateUpdate.vue'
import { getDisplayDate } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { computed, reactive } from 'vue'

const props = defineProps({
  task: { type: Object },
})

const emit = defineEmits(['update', 'error'])
const auth = useAuthStore()
const dateUpdateModal = reactive({
  user: null,
  type: '',
})

function handleDateChangeModal(type) {
  dateUpdateModal.user = auth.user
  dateUpdateModal.type = type
}

const statusSerial = {
  PENDING: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CLOSED: 4,
}

const currentStatusSerial = computed(() => {
  return statusSerial?.[taskStatus.value] || 0
})

const mainClass = computed(() => {
  return {
    'bg-yellow-50': taskStatus.value === 'IN_PROGRESS',
    'bg-green-50': taskStatus.value === 'COMPLETED',
    'bg-red-50': taskStatus.value === 'PENDING',
    'bg-blue-50': props.task?.closed_at,
  }
})

const taskStatus = computed(() => {
  return props.task?.status
})

async function handleUpdateDate() {
  emit('update')
  dateUpdateModal.user = null
  dateUpdateModal.type = ''
}

const timelineItems = computed(() => {
  return [
    {
      date: getDisplayDate(props.task?.assigned_at),
      title: 'Assigned',
      description: 'Task assigned to team or employee',
      icon: 'fas fa-user-check text-blue-500 ml-[2px]',
      status: 'assigned',
      serial: 1,
      active: !!props.task?.assigned_at,
    },
    {
      date: getDisplayDate(props.task?.started_at),
      title: 'Started',
      description: 'Work has been started',
      icon: 'fas fa-play text text-green-500 ml-[2px]',
      status: 'started',
      serial: 2,
      active: !!props.task?.started_at || currentStatusSerial.value >= statusSerial.IN_PROGRESS,
    },
    {
      date: getDisplayDate(props.task?.completed_at),
      title: 'Completed',
      description: 'Task was finished successfully',
      icon: 'fas fa-check-circle text-green-500',
      status: 'completed',
      serial: 3,
      active: !!props.task?.completed_at || currentStatusSerial.value >= statusSerial.COMPLETED,
    },
    {
      date: getDisplayDate(props.task?.deadline),
      title: 'Deadline',
      description: 'Deadline for the task',
      icon: 'fas fa-clock text-yellow-500',
      status: 'deadline',
      serial: 4,
      active: !!props.task?.deadline,
    },
  ].sort((a, b) => {
    if (a.date === null || b.date === null || new Date(a.date) == new Date(b.date)) {
      return a.serial - b.serial
    }

    return new Date(a.date) - new Date(b.date)
  })
})
</script>
<template>
  <div class="border py-8 px-4 rounded" :class="mainClass">
    <div class="border-gray-300">
      <div
        v-if="props.task?.is_target"
        class="bg-yellow-200 px-2 py-0.5 rounded-lg text-yellow-900 border border-yellow-400 w-full mb-6 text-center"
      >
        <i class="fad fa-bullseye-arrow mr-3"></i>
        TARGET TASK
      </div>

      <ol class="relative border-l-2 border-gray-300 ml-2 space-y-8">
        <!-- Assigned -->
        <li class="ml-5" v-for="(timelineItem, index) in timelineItems" :key="index">
          <div
            class="absolute size-5 flex items-center justify-center rounded-full -left-3 border-2 bg-white border-gray-300 opacity-100"
          >
            <i :class="timelineItem.icon" class="text-xs" v-if="timelineItem.active"></i>
          </div>

          <div :class="{ 'opacity-30': !timelineItem.active }">
            <div
              class="mb-1 text-sm font-normal leading-none text-gray-500 flex items-center gap-3 h-2 justify-between"
              v-if="timelineItem.active"
            >
              <span v-if="timelineItem.date">
                {{ timelineItem.date }}
              </span>
              <button
                v-if="
                  props.task?.children_task_count === 0 &&
                  timelineItem.status === 'started' &&
                  timelineItem.active
                "
                class="btn-3 px-2 h-5 text-sm font-semibold !border-1 disabled:opacity-30 disabled:pointer-events-none"
                @click.prevent="() => handleDateChangeModal('start-date')"
                :disabled="!!props.task.closed_at"
              >
                {{ timelineItem.date ? 'Edit' : 'Set Date' }}
              </button>
              <button
                v-if="
                  props.task?.children_task_count === 0 &&
                  timelineItem.active &&
                  timelineItem.status === 'completed'
                "
                class="btn-3 px-2 h-5 text-sm font-semibold !border-1 disabled:opacity-30 disabled:pointer-events-none"
                @click.prevent="() => handleDateChangeModal('finish-date')"
                :disabled="!!props.task.closed_at"
              >
                {{ timelineItem.date ? 'Edit' : 'Set Date' }}
              </button>
            </div>
            <h3 class="text-base font-semibold text-gray-700">
              {{ timelineItem.title }}
            </h3>
          </div>
        </li>
      </ol>
    </div>

    <OverlyModal v-if="dateUpdateModal.user">
      <TaskUserDateUpdate
        :task="props.task"
        :user="dateUpdateModal.user"
        :type="dateUpdateModal.type"
        @closeClick="dateUpdateModal.user = null"
        @updateDate="handleUpdateDate"
      />
    </OverlyModal>
  </div>
</template>
