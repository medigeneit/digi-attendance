<script setup>
import TaskUserAssignForm from '@/components/tasks/TaskUserAssignForm.vue'
import { useRoute, useRouter } from 'vue-router'

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
  <div class="container mx-auto p-6">
    <TaskUserAssignForm
      :taskId="taskId"
      @success="handleOnSuccess"
      @cancelClick="handleOnCancelClick"
    />
  </div>
</template>
