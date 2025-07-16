<script setup>
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import { useRoute, useRouter } from 'vue-router'

// const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const taskId = route.params.id

const handleOnSuccess = () => {
  router.back()
}

const handleOnCancelClick = () => {
  router.back()
}
</script>

<template>
  <div class="container mx-auto p-2 max-w-4xl w-full bg-white rounded shadow">
    <TaskEditForm :taskId="taskId" @updated="handleOnSuccess" @close="handleOnCancelClick" />
  </div>
</template>
