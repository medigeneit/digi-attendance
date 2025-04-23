<script setup>
import CommentModal from '@/components/CommentModal.vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBugStore } from '@/stores/useBugStore'
const store = useBugStore()
const router = useRouter()
const showCommentModal = ref(false)
const selectedBugId = ref(null)
const userId = 1 // অ্যাকচুয়াল auth ইউজার আইডি

onMounted(() => {
  store.fetchBugs()
})

const goToAdd = () => {
  router.push({ name: 'BugAdd' })
}

const goToEdit = (id) => {
  router.push({ name: 'BugEdit', params: { id } })
}

const openComment = (id) => {
  selectedBugId.value = id
  showCommentModal.value = true
}

const closeComment = () => {
  showCommentModal.value = false
  selectedBugId.value = null
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Bugs</h2>
      <button
        @click="goToAdd"
        class="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-full transition"
      >
        Add Bug
      </button>
    </div>

    <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading bugs...</div>

    <div v-else-if="store.error" class="text-center py-4 text-red-500">
      {{ store.error }}
    </div>

    <table v-else class="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-4 py-2 text-left">#</th>
          <th class="px-4 py-2 text-left">Title</th>
          <th class="px-4 py-2 text-left">Description</th>
          <th class="px-4 py-2 text-left">Todo</th>
          <th class="px-4 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(bug, index) in store.bugs" :key="bug.id" class="border-t hover:bg-gray-50">
          <td class="px-4 py-2">{{ index + 1 }}</td>
          <td class="px-4 py-2 font-medium">{{ bug.title }}</td>

          <td class="px-4 py-2 text-sm text-gray-600">
            {{ bug.description ? bug.description.slice(0, 50) + '...' : 'No description' }}
          </td>

          <td class="px-4 py-2">
            <RouterLink
              :to="{
                name: 'TodoAdd',
                params: { todoable_id: bug?.id },
                query: { todoable_type: 'bug' },
              }"
              class="main-button py-1"
              >Add Todo</RouterLink
            >
          </td>

          <td class="px-4 py-2 flex gap-4">
            <button @click="goToEdit(bug.id)" class="btn-2">Edit</button>
            <button
              @click="openComment(bug.id)"
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
      :commentable-id="selectedBugId"
      commentable-type="bug"
      :user-id="userId"
      :on-close="closeComment"
      @submitted="store.fetchBugs"
    />
  </div>
</template>
