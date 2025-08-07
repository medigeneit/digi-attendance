<script setup>
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useTaskUserStore } from '@/stores/taskUser'
import { onMounted, ref, watch } from 'vue'
const props = defineProps({
  task: { type: Object },
  user: { user: Object },
  type: { type: String },
})

const emit = defineEmits(['closeClick', 'updateDate'])
const taskUserStore = useTaskUserStore()
const date = ref('')
const message = ref('')

async function handleSubmitDate() {
  console.log({ date: date.value })

  try {
    if (props.type == 'start-date') {
      await taskUserStore.updateUserStartDate(props.task.id, props.user.id, date.value || '0')
    } else if (props.type == 'finish-date') {
      await taskUserStore.updateUserFinishDate(props.task.id, props.user.id, date.value || '0')
    }
    emit('updateDate')
  } catch (err) {
    message.value = err.response?.data?.message || `Failed to update ${props.type}`
  }
}

function setDate(task) {
  if (task) {
    const taskDate = props.type === 'start-date' ? task.started_at : task.completed_at

    date.value = getYearMonthDayFormat(taskDate)
  }
}

watch(
  () => props.task,
  (newTask) => {
    setDate(newTask)
  },
  { immediate: true },
)

onMounted(() => {
  setDate(props.task)
})
</script>
<template>
  <form class="p-4" @submit.prevent="handleSubmitDate">
    <div class="border-b text-center">
      <h2 v-if="type == 'start-date'">Edit Start Date</h2>
      <h2 v-else-if="type == 'finish-date'">Edit Completed Date</h2>
    </div>
    <div class="text-center font-semibold text-blue-800 my-4">
      {{ task.title }}
    </div>
    <div class="flex justify-center w-full">
      <div class="py-6 w-4/12">
        <label class="block text-xs font-semibold">
          {{ type == 'start-date' ? 'Start date' : 'Completed date' }}
        </label>
        <input type="date" v-model="date" class="border py-2 px-4 rounded-md w-full" />
      </div>
    </div>
    <hr class="mt-4" />
    <div class="mt-3">
      <div class="inline-block text-sm text-orange-700 text-center w-full" v-if="message">
        {{ message }}
      </div>
    </div>
    <div class="flex justify-between items-center">
      <button class="btn-3" @click.prevent="emit('closeClick')">Close</button>
      <div>
        <button class="btn-2">Submit</button>
      </div>
    </div>
  </form>
</template>
