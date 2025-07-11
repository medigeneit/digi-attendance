<script setup>
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import { useAuthStore } from '@/stores/auth'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const taskCreated = ref(false)
const taskCreatedData = ref(null)

function handleTaskCreated(taskData) {
  try {
    toToBackRoute()
  } catch {
    taskCreated.value = true
    taskCreatedData.value = taskData
  }
}

function toToBackRoute() {
  if (route.query['back-to']) {
    return router.push({ path: route.query['back-to'] })
  }
  throw Error('No back route defined')
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div v-if="taskCreated" class="h-[70vh] w-full flex justify-center items-center">
      <div
        class="flex flex-col gap-4 min-h-[40vh] justify-center items-center border max-w-4xl w-full px-16 mx-auto bg-white p-4"
      >
        <div class="flex gap-4">
          <div>
            <i class="fas fa-check-circle text-4xl text-green-400"></i>
          </div>
          <div class="text-2xl text-gray-800">Task Successfully Created</div>
        </div>
        <div class="text-xl my-3">Task: {{ taskCreatedData.title }}</div>
        <div class="flex gap-2">
          <RouterLink
            :to="{ name: 'TaskShow', params: { id: taskCreatedData.id } }"
            class="btn-2"
            @click.prevent="taskCreated = false"
            >Show Task</RouterLink
          >
          <button class="btn-3" @click.prevent="taskCreated = false">Create another Task</button>
        </div>
      </div>
    </div>
    <TaskAddForm
      v-else
      :parentTaskId="Number(route.query?.parent_id)"
      :requirementId="Number(route.query?.requirement_id)"
      @taskCreated="handleTaskCreated"
      @close="
        () => {
          try {
            toToBackRoute()
          } catch {
            $event.preventDefault()
          }
        }
      "
    />
  </div>
</template>
