<script setup>
import { deleteTask, restoreTask } from '@/services/task'
import { ref } from 'vue'
import CountdownTimer from '../CountdownTimer.vue'
import LoaderView from '../common/LoaderView.vue'
const props = defineProps({
  task: { type: Object },
})

const securityCheck = ref('')
const state = ref('')
const emit = defineEmits(['closeClick', 'delete'])
const message = ref('')
const timeToRestore = 5000
let timeoutId = 0

async function handleSubmitDate() {
  if (!securityCheck.value) {
    return (message.value = 'Type the task title on input box')
  }
  clearTimeout(timeoutId)

  try {
    message.value = ''
    if (state.value === 'deleted') {
      state.value = 'restoring'
      await restoreTask(props.task.id)
      state.value = 'restored'
    } else {
      state.value = 'deleting'
      await deleteTask(props.task.id, { params: { security_check: securityCheck.value } })
      state.value = 'deleted'
    }
    if (state.value == 'deleted') {
      timeoutId = setTimeout(() => {
        emitDelete()
      }, timeToRestore)
    } else {
      emit('closeClick')
    }
  } catch (err) {
    state.value = 'error'
    message.value = err.response?.data?.message || `Failed to update ${props.type}`
  }
}

function handleCloseClick() {
  if (state.value === 'deleted') {
    emitDelete()
  }
  emit('closeClick')
}

function emitDelete() {
  state.value = ''
  emit('delete')
}
</script>
<template>
  <form class="p-4 relative" @submit.prevent="handleSubmitDate">
    <div class="border-b text-center">
      <h2>Delete Task</h2>
    </div>

    <div class="mb-2 mt-6">
      <div class="text-xs uppercase text-gray-500 font-semibold">Task:</div>
      <div>{{ task?.title }}</div>
    </div>

    <template v-if="state == 'deleted'">
      <div class="flex gap-2 justify-center items-center mb-12 text-green-600">
        <i class="fad fa-check-circle fa-4x"></i>
        <span class="text-xl md:text-2xl">Task Successfully deleted</span>
      </div>
    </template>

    <template v-else>
      <div class="flex justify-center">
        <div class="py-6 w-full text-center">
          <label class="block mb-2">
            Type <span class="font-semibold text-red-600 mx-2 text-xl">{{ task?.title }}</span> and
            submit to delete
          </label>
          <input type="text" v-model="securityCheck" class="border py-2 px-4 rounded-md w-[70%]" />
        </div>
      </div>
      <hr />
      <div class="mt-2">
        <div class="inline-block text-sm text-orange-700 text-center w-full" v-if="message">
          {{ message }}
        </div>
      </div>
    </template>

    <div class="flex justify-between items-center">
      <button class="btn-3" type="button" @click.prevent="handleCloseClick">Close</button>

      <button v-if="state == 'deleted'" class="btn-2-red">
        Undo Delete in
        <CountdownTimer
          :hide-if-zero-value="true"
          :millisecond="timeToRestore"
          v-if="state == 'deleted'"
        />
      </button>
      <button v-else class="btn-2-red">Delete</button>
    </div>
    <LoaderView
      class="absolute inset-0 bg-gray-200/70 flex items-start justify-center"
      v-if="state == 'deleting' || state == 'restoring'"
    >
      {{ String(state).charAt(0).toUpperCase() + String(state).slice(1) }}
    </LoaderView>
  </form>
</template>
