<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SectionLoading from '../common/SectionLoading.vue'

const props = defineProps({
  taskId: {
    type: [String, Number],
    required: true,
  },
})

const emit = defineEmits(['updated', 'cancel'])

const store = useTaskStore()
const task = ref()
const loading = ref(false)
const selectedUsers = ref([])

const form = ref({
  title: '',
  requirement_id: '',
  user_ids: '',
  priority: 'MEDIUM',
  status: 'PENDING',
  description: '',
  is_important: false,
  is_urgent: false,
})

onMounted(async () => {
  // userStore.fetchUsers()
  loading.value = true
  task.value = (
    await store.fetchTask(props.taskId, {}, { fetchOnly: true, loadingBeforeFetch: false })
  )?.task
  selectedUsers.value = task.value.users
  loading.value = false
  form.value = {
    title: task.value.title,
    requirement_id: task.value.requirement_id,
    user_ids: task.value.users.map((u) => u.id).join(','),
    priority: task.value.priority,
    status: task.value.status,
    description: task.value.description,
    is_important: task.value.is_important,
    is_urgent: task.value.is_urgent,
  }
})

watch(
  () => task.value,
  (newTask) => {
    form.value = {
      title: newTask.title,
      requirement_id: newTask.requirement_id,
      user_ids: newTask.users.map((u) => u.id).join(','),
      priority: newTask.priority,
      status: newTask.status,
      description: newTask.description,
    }
  },
)

const update = async () => {
  loading.value = true

  const payload = {
    ...form.value,
    user_ids: selectedUsers.value?.map((u) => Number(u.id)) || [],
  }

  await store.updateTask(props.taskId, payload, { loadingBeforeFetch: false })
  loading.value = false

  emit('updated')
}
</script>

<template>
  <div class="p-4">
    <SectionLoading v-if="loading" />

    <h2 class="text-2xl font-semibold text-gray-800 mb-4">Edit Task</h2>

    <div v-if="loading" class="text-center py-4 text-gray-500">Loading form...</div>

    <form v-else-if="task" @submit.prevent="update">
      <div class="mb-4">
        <label class="block text-gray-700 font-medium mb-2">Task Title</label>
        <input
          v-model="form.title"
          required
          placeholder="Enter task title"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="mb-4">
        <label class="flex gap-1 items-center">
          <input type="checkbox" v-model="form.is_important" class="size-4" />
          <span class="block text-gray-600 text-base pt-1 mb-1 font-medium">Important</span>
        </label>
        <label class="flex gap-1 items-center">
          <input type="checkbox" v-model="form.is_urgent" class="size-4" />
          <span class="block text-gray-600 text-base mb-1 font-medium">Urgent</span>
        </label>
      </div>

      <div class="mb-4" v-if="task.requirement">
        <label class="block text-gray-700 font-medium mb-2">Requirement</label>
        <div>
          <p>{{ task?.requirement?.title }}</p>
        </div>
      </div>

      <!-- <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">User <RequiredIcon /></label>
          <MultiselectDropdown
            v-model="selectedUsers"
            :options="userStore.users"
            :multiple="true"
            track-by="id"
            label="label"
            placeholder="Select users"
          />
        </div> -->

      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- <div>
          <label class="block text-gray-700 font-medium mb-2">Priority</label>
          <select
            v-model="form.priority"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option>LOW</option>
            <option>MEDIUM</option>
            <option>HIGH</option>
            <option>CRITICAL</option>
          </select>
        </div> -->

        <div>
          <label class="block text-gray-700 font-medium mb-2">Status</label>
          <select
            v-model="form.status"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option>PENDING</option>
            <option>IN_PROGRESS</option>
            <option>COMPLETED</option>
            <option>BLOCKED</option>
          </select>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-gray-700 font-medium mb-2">Description</label>
        <textarea
          v-model="form.description"
          rows="4"
          placeholder="Enter task description"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>

      <div v-if="store.error" class="mb-4 text-red-500 font-medium">
        {{ store.error }}
      </div>

      <div class="flex items-center gap-4">
        <button
          :disabled="loading"
          type="submit"
          class="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded transition"
        >
          {{ loading ? 'Updating...' : 'Update Task' }}
        </button>

        <button
          type="button"
          @click="emit('close')"
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
        >
          Cancel
        </button>
      </div>
    </form>

    <div v-else class="text-center py-4 text-red-500">
      {{ store.error || 'Task not found.' }}
    </div>
  </div>
</template>
