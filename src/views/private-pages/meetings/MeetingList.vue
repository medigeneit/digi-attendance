<script setup>
import CommentModal from '@/components/CommentModal.vue'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = useMeetingStore()
const router = useRouter()
const showCommentModal = ref(false)
const selectedMeetingId = ref(null)

const userId = 1 // অ্যাকচুয়াল auth ইউজার আইডি
onMounted(() => {
  store.fetchMeetings()
})

const goToAdd = () => {
  router.push({ name: 'MeetingAdd' })
}

const goToEdit = (id) => {
  router.push({ name: 'MeetingEdit', params: { id } })
}

const openComment = (id) => {
  selectedMeetingId.value = id
  showCommentModal.value = true
}

const closeComment = () => {
  showCommentModal.value = false
  selectedMeetingId.value = null
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Meetings</h2>
      <button @click="goToAdd" class="btn-1">Add Meeting</button>
    </div>

    <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading meetings...</div>

    <div v-else-if="store.error" class="text-center py-4 text-red-500">
      {{ store.error }}
    </div>

    <table v-else class="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-4 py-2 text-left">#</th>
          <th class="px-4 py-2 text-left">Title</th>
          <th class="px-4 py-2 text-left">Start Time</th>
          <th class="px-4 py-2 text-left">End Time</th>
          <th class="px-4 py-2 text-left">Todo</th>
          <th class="px-4 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(meeting, index) in store.meetings"
          :key="meeting.id"
          class="border-t hover:bg-gray-50"
        >
          <td class="px-4 py-2">{{ index + 1 }}</td>
          <td class="px-4 py-2 font-medium">{{ meeting.title }}</td>
          <td class="px-4 py-2">
            {{
              meeting?.start_time
                ? new Date(meeting?.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''
            }}
          </td>
          <td class="px-4 py-2">
            {{
              meeting?.end_time
                ? new Date(meeting?.end_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''
            }}
          </td>
          <td class="px-4 py-2">
            <RouterLink
              :to="{
                name: 'TodoAdd',
                params: { todoable_id: meeting?.id },
                query: { todoable_type: 'meeting' },
              }"
              class="main-button py-1"
              ><i class="fas fa-plus-circle"></i
            ></RouterLink>
          </td>
          <td class="px-4 py-2 flex gap-3">
            <button @click="goToEdit(meeting.id)" class="btn-3 !px-2">
              <i class="far fa-edit"></i>
            </button>
            <RouterLink
              :to="{ name: 'MeetingUserAssign', params: { id: meeting?.id } }"
              class="btn-3 md:text-base text-xs"
            >
              Assign Users
            </RouterLink>
            <button
              @click="openComment(meeting.id)"
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
      :commentable-id="selectedMeetingId"
      commentable-type="meeting"
      :user-id="userId"
      :on-close="closeComment"
    />
    <!-- @submitted="taskStore.fetchTasks" -->
    <!-- optional refresh -->
  </div>
</template>
