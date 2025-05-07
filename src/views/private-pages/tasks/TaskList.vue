<script setup>
import CommentModal from '@/components/CommentModal.vue'
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = useTaskStore()
const router = useRouter()
const showCommentModal = ref(false)
const userId = 1 // অ্যাকচুয়াল auth ইউজার আইডি
const selectedTaskId = ref(null)

onMounted(() => {
  store.fetchTasks()
})

const goToAdd = () => {
  router.push({ name: 'TaskAdd' })
}

const goToEdit = (event, id) => {
  event.stopPropagation()
  router.push({ name: 'TaskEdit', params: { id } })
}

const goToShow = (id) => {
  router.push({ name: 'TaskShow', params: { id } })
}

const openComment = (event, id) => {
  event.stopPropagation()
  selectedTaskId.value = id
  showCommentModal.value = true
}

const closeComment = () => {
  showCommentModal.value = false
  selectedTaskId.value = null
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Task List</h2>
      <button @click="goToAdd" class="btn-1">Add Task</button>
    </div>

    <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading tasks...</div>

    <div v-else-if="store.error" class="text-center py-4 text-red-500">
      {{ store.error }}
    </div>

    <table v-else class="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-4 py-2 text-left">#</th>
          <th class="px-4 py-2 text-left">Title</th>
          <th class="px-4 py-2 text-left">Assign Users</th>
          <th class="px-4 py-2 text-left">Priority</th>
          <th class="px-4 py-2 text-left">Status</th>
          <!-- <th class="px-4 py-2 text-left">Todo</th> -->
          <th class="px-4 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(task, index) in store.tasks"
          :key="task.id"
          class="border-t hover:bg-gray-50 cursor-pointer"
          @click.prevent="goToShow(task.id)"
          role="button"
        >
          <td class="px-4 py-2">{{ index + 1 }}</td>

          <td class="px-4 py-2 font-medium">{{ task.title }}</td>

          <td class="px-4 py-2 font-medium grid gap-1">
            <RouterLink
              :to="`/settings/user-show/${user.id}`"
              @click="$event.stopPropagation()"
              v-for="user in task.users"
              :key="user.id"
              class="btn-1"
            >
              {{ user?.name }}
            </RouterLink>
          </td>

          <td class="px-4 py-2">
            <span
              :class="{
                'text-green-600': task.priority === 'LOW',
                'text-yellow-600': task.priority === 'MEDIUM',
                'text-orange-600': task.priority === 'HIGH',
                'text-red-600': task.priority === 'CRITICAL',
              }"
              class="font-semibold"
            >
              {{ task.priority }}
            </span>
          </td>

          <td class="px-4 py-2">
            <span
              :class="{
                'bg-gray-200': task.status === 'PENDING',
                'bg-blue-200': task.status === 'IN_PROGRESS',
                'bg-green-200': task.status === 'COMPLETED',
                'bg-red-200': task.status === 'BLOCKED',
              }"
              class="px-3 py-1 rounded-full"
            >
              {{ task.status }}
            </span>
          </td>

          <!-- <td class="px-4 py-2">
            <RouterLink
              :to="{
                name: 'TodoAdd',
                params: { todoable_id: task?.id },
                query: { todoable_type: 'task' },
              }"
              @click="$event.stopPropagation()"
              class="main-button py-1"
              >Add Todo</RouterLink
            >
          </td> -->

          <td class="px-4 py-2 flex gap-2">
            <button @click="goToEdit($event, task.id)" class="btn-2">Edit</button>

            <RouterLink
              :to="{ name: 'TaskUserAssign', params: { id: task?.id } }"
              class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-1 rounded-full transition"
              @click="$event.stopPropagation()"
            >
              Assign Users
            </RouterLink>

            <RouterLink
              :to="{ name: 'TaskAdd', query: { parent_id: task?.id } }"
              class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-1 rounded-full transition"
              @click="$event.stopPropagation()"
            >
              + Sub Task
            </RouterLink>

            <button
              @click="openComment($event, task.id)"
              class="bg-indigo-500 text-white px-3 py-1 rounded-full"
            >
              + Comment
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <!-- Comment Modal -->
    <CommentModal
      :show="showCommentModal"
      :commentable-id="selectedTaskId"
      commentable-type="task"
      :user-id="userId"
      :on-close="closeComment"
      @submitted="store.fetchTasks"
    />
  </div>
</template>
