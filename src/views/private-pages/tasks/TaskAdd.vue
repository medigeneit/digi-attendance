<script setup>
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="container mx-auto p-6">
    <TaskAddForm
      :parentTaskId="Number(route.query?.parent_id)"
      :requirementId="Number(route.query?.requirement_id)"
      @created="router.push({ name: 'TaskList' })"
      @close="router.push({ name: 'TaskList' })"
    />
  </div>
</template>
