<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const meetingStore = useMeetingStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const selectedUsers = ref([])
const user_ids = computed(() => selectedUsers.value.map((u) => u.id))
const meetingId = route.params.id
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  loading.value = true
  await meetingStore.fetchMeetings(meetingId)
  await userStore.fetchUsers() // all available users
  selectedUsers.value = meetingStore?.meeting?.users
  loading.value = false
})

const submit = async () => {
  loading.value = true
  error.value = null

  try {
    await meetingStore.assignUsers(meetingId, user_ids.value)
    router.push({ name: 'MeetingList' })
  } catch (err) {
    error.value = err.message || 'Assign users failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">
        Assign Users to Meeting: "{{ meetingStore?.meeting?.title }}"
      </h2>

      <div v-if="loading" class="text-center text-gray-500 py-4">Loading users...</div>

      <form v-else @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Select Users</label>
          <MultiselectDropdown
            v-model="selectedUsers"
            :options="userStore.users"
            :multiple="true"
            track-by="id"
            label="name"
            placeholder="Select users"
          />
        </div>

        <div v-if="error" class="mb-4 text-red-500 font-medium">
          {{ error }}
        </div>

        <div class="flex items-center gap-4">
          <button
            :disabled="loading"
            type="submit"
            class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? 'Assigning...' : 'Assign Users' }}
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
    </div>
  </div>
</template>
