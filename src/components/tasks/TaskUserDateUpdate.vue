<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { useTaskUserStore } from '@/stores/taskUser'
import { ref } from 'vue'
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
</script>
<template>
  <form class="p-4" @submit.prevent="handleSubmitDate">
    <div class="border-b text-center">
      <h2 v-if="type == 'start-date'">Edit Start Date</h2>
      <h2 v-else-if="type == 'finish-date'">Edit Finish Date</h2>
    </div>
    <div class="mb-2 mt-6">
      <div class="text-xs uppercase text-gray-500 font-semibold">Task:</div>
      <div>{{ task.title }}</div>
    </div>
    <div>
      <div class="text-xs uppercase text-gray-500 font-semibold">User:</div>
      <UserChip :user="user" />
    </div>
    <div class="flex justify-center">
      <div class="py-6">
        <label class="block text-xs font-semibold">Date</label>
        <input type="date" v-model="date" class="border py-2 px-4 rounded-md" size="8" />
      </div>
    </div>
    <div class="mt-2">
      <div class="inline-block text-sm text-orange-700 text-center w-full" v-if="message">
        {{ message }}
      </div>
    </div>
    <div class="flex justify-between items-center">
      <div>
        <button class="btn-2">Submit</button>
      </div>
      <button class="btn-3" @click.prevent="emit('closeClick')">Close</button>
    </div>
  </form>
</template>
