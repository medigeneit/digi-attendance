<script setup>
import { useMeetingStore } from '@/stores/useMeetingStore'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useMeetingStore()
const route = useRoute()
const router = useRouter()

const meetingId = route.params.id
const loading = ref(false)

const form = ref({
  title: '',
  start_time: '',
  end_time: '',
  notes: '',
})

onMounted(async () => {
  await store.fetchEditMeeting(meetingId)
  form.value = {
    title: store.meeting?.title || '',
    start_time: store.meeting?.start_time ? store.meeting.start_time.slice(0, 16) : '',
    end_time: store.meeting?.end_time ? store.meeting.end_time.slice(0, 16) : '',
    notes: store.meeting?.notes || '',
  }
})

const update = async () => {
  loading.value = true

  await store.updateMeeting(meetingId, form.value)
  loading.value = false

  if (!store.error) {
    router.push({ name: 'MeetingList' })
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Edit Meeting</h2>

      <div v-if="store.loading" class="text-center py-4 text-gray-500">
        Loading meeting details...
      </div>

      <form v-else-if="store.meeting" @submit.prevent="update">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Meeting Title</label>
          <input
            v-model="form.title"
            required
            placeholder="Enter meeting title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Start Time</label>
          <input
            v-model="form.start_time"
            required
            type="datetime-local"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">End Time</label>
          <input
            v-model="form.end_time"
            required
            type="datetime-local"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Notes (Optional)</label>
          <textarea
            v-model="form.notes"
            rows="4"
            placeholder="Enter meeting notes"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>

        <div class="flex items-center gap-4">
          <button
            :disabled="loading"
            type="submit"
            class="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? 'Updating...' : 'Update Meeting' }}
          </button>

          <button
            type="button"
            @click="router.push({ name: 'MeetingList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>

      <div v-else class="text-center py-4 text-red-500">
        {{ store.error || 'Meeting not found.' }}
      </div>
    </div>
  </div>
</template>
