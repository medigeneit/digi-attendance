<script setup>
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const taskId = route.params.id

function handleUpdateTask() {
  router.push({ name: 'TaskList' })
}
</script>

<template>
  <div class="container mx-auto p-6">
    <TaskEditForm :taskId="taskId" @updated="handleUpdateTask" />
  </div>
</template>
