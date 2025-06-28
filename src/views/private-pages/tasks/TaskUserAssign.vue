<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import UserChip from '@/components/user/UserChip.vue'
import { useTaskStore } from '@/stores/useTaskStore'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const taskStore = useTaskStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const selectedUsers = ref([])
const user_ids = computed(() => selectedUsers.value.map((u) => u.id))
const taskId = route.params.id
const loading = ref(false)
const error = ref(null)
const users = ref([])

onMounted(async () => {
  loading.value = true
  await taskStore.fetchTask(taskId, { with_parent: 'true' })
  if (taskStore.task.parent) {
    users.value = taskStore.task?.parent?.users || []
  } else {
    await userStore.fetchUsers() // all available users
    users.value = userStore.users
  }

  selectedUsers.value = taskStore.task.users
  loading.value = false
})

const submit = async () => {
  loading.value = true
  error.value = null

  try {
    await taskStore.assignUsers(taskId, user_ids.value)
    router.push({ name: 'TaskList' })
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
      <h2 class="text-xl font-semibold text-gray-800 mb-4">
        Assign Users to Task: "{{ taskStore.task?.title }}"
      </h2>

      <div v-if="loading" class="text-center text-gray-500 py-4">Loading users...</div>

      <form v-else @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium">Select Users</label>
          <MultiselectDropdown
            v-model="selectedUsers"
            :options="users"
            :multiple="true"
            track-by="id"
            label="label"
            placeholder="Select users"
          >
            <template #selection="{ ...attrs }">
              <div class="mb-2 flex flex-wrap gap-2">
                <UserChip v-for="user in attrs?.values || []" :key="user.id" :user="user">
                  <template #after="{ user }">
                    <button
                      class="size-6 border rounded-full hover:bg-red-400 hover:text-white"
                      @click.prevent="
                        selectedUsers = selectedUsers.filter((su) => su.id !== user.id)
                      "
                    >
                      &times;
                    </button>
                  </template>
                </UserChip>
              </div>
              <!-- <pre>{{ attrs }}</pre> -->
            </template>
            <template #option="{ option: user }">
              <UserChip :user="user" />
            </template>
          </MultiselectDropdown>
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
            @click="router.push({ name: 'TaskList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
