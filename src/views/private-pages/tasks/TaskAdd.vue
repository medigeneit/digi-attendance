<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useUserStore } from '@/stores/user'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const store = useTaskStore()
const router = useRouter()
const requirementStore = useRequirementStore()
const userStore = useUserStore()
const { requirements } = storeToRefs(requirementStore)
const { users } = storeToRefs(userStore)
const selectedUser = ref([])
const user_ids = computed(() => selectedUser.value.map((u) => u.id))
const selectedRequirement = ref('')
const requirement_id = computed(() => selectedRequirement.value?.id)

const form = ref({
  title: '',
  requirement_id: null,
  user_ids: [],
  priority: 'MEDIUM',
  status: 'PENDING',
  description: '',
})

watch(requirement_id, (val) => {
  form.value.requirement_id = val
})
watch(user_ids, (val) => {
  form.value.user_ids = val
})

onMounted(() => {
  requirementStore.fetchRequirements()
  userStore.fetchUsers()
})

const loading = ref(false)

const submit = async () => {
  loading.value = true

  const payload = {
    ...form.value,
  }
  await store.createTask(payload)
  loading.value = false

  if (!store.error) {
    router.push({ name: 'TaskList' })
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Add New Task</h2>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Task Title</label>
          <input
            v-model="form.title"
            required
            placeholder="Enter task title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Requirement ID</label>
          <MultiselectDropdown
            v-model="selectedRequirement"
            :options="requirements"
            :multiple="false"
            track-by="id"
            label="title"
            placeholder="Select department"
            required
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">User IDs</label>
          <MultiselectDropdown
            v-model="selectedUser"
            :options="users"
            :multiple="true"
            track-by="id"
            label="name"
            placeholder="Select users"
          />
          <!-- <input
            v-model="form.user_ids"
            required
            placeholder="e.g., 1,2,3"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          /> -->
          <small class="text-gray-500">Comma-separated user IDs.</small>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-gray-700 font-medium mb-2">Priority</label>
            <select
              v-model="form.priority"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
            </select>
          </div>

          <div>
            <label class="block text-gray-700 font-medium mb-2">Status</label>
            <select
              v-model="form.status"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option>PENDING</option>
              <option>IN_PROGRESS</option>
              <option>COMPLETED</option>
              <option>BLOCKED</option>
            </select>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Description</label>
          <textarea
            v-model="form.description"
            rows="4"
            placeholder="Enter task description"
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
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? 'Saving...' : 'Save Task' }}
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
