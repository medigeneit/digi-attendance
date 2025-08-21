<script setup>
import { getDisplayDate } from '@/libs/datetime'
import { updateTaskStatus } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { computed, reactive, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import OverlyModal from '../common/OverlyModal.vue'
import TaskUserDateUpdate from './TaskUserDateUpdate.vue'

const props = defineProps({
  task: { type: Object },
})

const emit = defineEmits(['updateStatus', 'error'])
const auth = useAuthStore()
const changingStatus = ref('')
const state = ref()
const error = ref()
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

const nextAction = computed(() => {
  if (taskStatus.value == 'PENDING') {
    return 'Start'
  } else if (taskStatus.value == 'IN_PROGRESS') {
    return 'Finish'
  } else if (taskStatus.value == 'COMPLETED') {
    return 'Close'
  }

  return ''
})

const modalTitle = computed(() => {
  if (nextAction.value == 'Start') {
    return 'Start Task'
  } else if (nextAction.value == 'Finish') {
    return 'Finish Task'
  } else if (nextAction.value == 'Close') {
    return 'Close Task'
  }

  return ''
})

async function handleStatusSubmit() {
  state.value = 'submitting'
  try {
    await updateTaskStatus(props.task.id, { status: changingStatus.value })
    changingStatus.value = ''
    emit('updateStatus')
  } catch (err) {
    error.value = err.response?.data?.message
    emit('error')
  } finally {
    state.value = ''
  }
}

const actionIconClass = computed(() => {
  if (nextAction.value == 'Start') {
    return 'fas fa-play-circle text-blue-500'
  } else if (nextAction.value == 'Finish') {
    return 'fas fa-stop-circle text-blue-500'
  }
  return ''
})

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
    <div v-if="taskStatus === 'BLOCKED'">
      <div class="flex flex-col items-center">
        <i class="fas fa-lock-alt fa-4x text-violet-500"></i>
        <div class="text-3xl mb-2 text-violet-500 mt-4">Task Blocked</div>
      </div>
    </div>
    <div v-else class="flex">
      <div class="border-r-2 border-dashed pr-6 border-gray-300">
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
                class="mb-1 text-sm font-normal leading-none text-gray-500 flex items-center gap-3 h-5 justify-between"
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
              <h3 class="text-lg font-semibold text-gray-700">
                {{ timelineItem.title }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ timelineItem.description }}
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div class="flex flex-grow justify-center items-center">
        <div v-if="task?.closed_at" class="flex flex-col justify-center items-center">
          <i class="fad fa-lock-alt fa-6x text-blue-500"></i>
          <div class="text-blue-700 text-2xl mt-4">Task closed</div>
        </div>

        <div v-else-if="taskStatus === 'PENDING'">
          <button
            class="btn-3 mt-2"
            v-if="task?.children_task_count === 0"
            @click.prevent="changingStatus = 'IN_PROGRESS'"
          >
            Start Working
          </button>
          <div v-else>
            <div class="text-center">
              <i class="fas fa-hourglass-half text-yellow-500 fa-2x"></i>
            </div>
            <div class="text-yellow-600 text-xl mt-2">Task Pending</div>
          </div>
        </div>

        <div
          v-else-if="taskStatus === 'IN_PROGRESS'"
          class="flex justify-center items-center flex-col"
        >
          <i class="fas fa-circle fa-2x text-red-800 animate-pulse"></i>
          <div class="mb-3 text-2xl my-4 text-red-800">Task In Progress</div>
          <button
            class="btn-3"
            @click.prevent="changingStatus = 'COMPLETED'"
            v-if="task?.children_task_count === 0"
          >
            Finish Task
          </button>
        </div>

        <div
          v-else-if="taskStatus === 'COMPLETED'"
          class="flex flex-col justify-center items-center"
        >
          <i class="fad fa-check-circle fa-6x text-green-500"></i>
          <div class="text-green-700 text-2xl">Task Has been completed</div>
          <button class="btn-3 mt-8" @click.prevent="changingStatus = 'CLOSED'">Close Task</button>
        </div>
      </div>
    </div>

    <OverlyModal v-if="changingStatus">
      <form class="p-4 rounded relative" @submit.prevent="handleStatusSubmit">
        <LoaderView
          v-if="state === 'submitting'"
          class="absolute inset-0 flex items-center justify-center bg-opacity-90"
          >Submitting!</LoaderView
        >
        <h3 class="border-b -mx-4 px-4 border -mt-4 py-2 text-xl bg-gray-50">{{ modalTitle }}</h3>
        <div class="my-6">
          <div class="text-center font-semibold text-blue-800 mb-4">
            {{ task?.title }}
          </div>
          <div class="text-center my-1 text-lg">Are you sure?</div>
          <div class="text-center my-1">
            Want to
            <span class="border px-2 rounded-md bg-gray-50">
              <i class="text-sm" :class="actionIconClass"></i> {{ nextAction }}</span
            >
            the task?
          </div>
        </div>
        <hr class="mt-3 -mx-4" />
        <div>
          <div class="text-red-600 text-center mt-2 text-sm">{{ error }}</div>
          <div class="flex justify-between mt-3">
            <button class="btn-3" @click.prevent="changingStatus = ''">Cancel</button>
            <button class="btn-2">
              <i class="text-xl text-white" :class="actionIconClass"></i> {{ nextAction }} Task
            </button>
          </div>
        </div>
      </form>
    </OverlyModal>
    <OverlyModal v-if="dateUpdateModal?.user">
      <TaskUserDateUpdate
        :task="props.task"
        :user="dateUpdateModal.user"
        :type="dateUpdateModal.type"
        @closeClick="dateUpdateModal.user = null"
        @updateDate="
          () => {
            dateUpdateModal.user = null
            dateUpdateModal.type = null
            emit('updateStatus')
          }
        "
      />
    </OverlyModal>
  </div>
</template>
