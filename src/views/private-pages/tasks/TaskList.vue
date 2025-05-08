<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'
import CommentModal from '@/components/CommentModal.vue'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = useTaskStore()
const { flattenedTasks } = storeToRefs(store)
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

const openComment = (id, r) => {
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

    <div v-else class="space-y-4">
      <div
        v-for="task in store?.taskListTree || []"
        :key="task.id"
        class="rounded-lg border bg-white overflow-hidden"
      >
        <TaskTreeView
          :task="task"
          class="!border-0"
          @commentButtonClick="openComment($event, task.id)"
        />
      </div>
    </div>

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
