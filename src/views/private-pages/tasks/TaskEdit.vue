<script setup>
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()
// const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const taskId = route.params.id
const selectedUsers = ref([])

const form = ref({
  title: '',
  requirement_id: '',
  user_ids: '',
  priority: 'MEDIUM',
  status: 'PENDING',
  description: '',
})

onMounted(async () => {
  // userStore.fetchUsers()
  await store.fetchTask(taskId)
  selectedUsers.value = store.task.users
  form.value = {
    title: store.task.title,
    requirement_id: store.task.requirement_id,
    user_ids: store.task.users.map((u) => u.id).join(','),
    priority: store.task.priority,
    status: store.task.status,
    description: store.task.description,
  }
})

watch(
  () => store.task,
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

function handleUpdateTask() {
  router.push({ name: 'TaskList' })
}
</script>

<template>
  <div class="container mx-auto p-6">
    <TaskEditForm :taskId="taskId" @updated="handleUpdateTask" />
  </div>
</template>
