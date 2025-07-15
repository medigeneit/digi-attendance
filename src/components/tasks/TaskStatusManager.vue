<script setup>
import { updateTaskStatus } from '@/services/task'
import { computed, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import OverlyModal from '../common/OverlyModal.vue'

const props = defineProps({
  task: { type: Object },
})

const emit = defineEmits(['updateStatus', 'error'])

const changingStatus = ref('')
const state = ref()
const error = ref()
const mainClass = computed(() => {
  return {
    'bg-yellow-50': props.task.status === 'IN_PROGRESS',
    'bg-green-50': props.task.status === 'COMPLETED',
    'bg-blue-50': props.task.closed_at,
  }
})

const nextAction = computed(() => {
  if (props.task.status == 'PENDING') {
    return 'Start'
  } else if (props.task.status == 'IN_PROGRESS') {
    return 'Finish'
  } else if (props.task.status == 'COMPLETED') {
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
</script>
<template>
  <div class="border py-8 px-4 rounded" v-if="task.children_task_count === 0" :class="mainClass">
    <!-- <pre>{{ task.status }}</pre> -->

    <div class="flex justify-center items-center">
      <div v-if="task.closed_at" class="flex flex-col justify-center items-center">
        <i class="fad fa-lock-alt fa-6x text-blue-500"></i>
        <div class="text-blue-700 text-2xl mt-4">Task closed</div>
      </div>

      <div v-else-if="task.status === 'PENDING'">
        <button class="btn-3" @click.prevent="changingStatus = 'IN_PROGRESS'">Start Working</button>
      </div>

      <div v-else-if="task.status === 'IN_PROGRESS'">
        <div class="mb-3">Task In Progress</div>
        <button class="btn-3" @click.prevent="changingStatus = 'COMPLETED'">Finish Task</button>
      </div>

      <div
        v-else-if="task.status === 'COMPLETED'"
        class="flex flex-col justify-center items-center"
      >
        <i class="fad fa-check-circle fa-6x text-green-500"></i>
        <div class="text-green-700 text-2xl">Task Has been completed</div>
        <button class="btn-3 mt-8" @click.prevent="changingStatus = 'CLOSED'">Close Task</button>
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
            {{ task.title }}
          </div>
          <div class="text-center my-1 text-lg">Are you sure?</div>
          <div class="text-center my-1">
            Want to <span class="border px-2 rounded-md bg-gray-50 mx-2">{{ nextAction }}</span> the
            task?
          </div>
        </div>
        <hr class="mt-3 -mx-4" />
        <div>
          <div class="text-red-600 text-center mt-2 text-sm">{{ error }}</div>
          <div class="flex justify-between mt-3">
            <button class="btn-3" @click.prevent="changingStatus = ''">Cancel</button>
            <button class="btn-2">{{ nextAction }} Task</button>
          </div>
        </div>
      </form>
    </OverlyModal>
  </div>
</template>
