<template>
  <div class="relative w-72">
    <!-- Trigger Button -->
    <button
      @click="toggleDropdown"
      class="w-full px-4 py-2 text-left bg-white border rounded shadow-sm"
    >
      {{ selected ? selected.name : 'Filter by assignees' }}
    </button>

    <!-- Dropdown Panel -->
    <div
      v-if="open"
      class="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-y-auto"
    >
      <!-- Search -->
      <input
        v-model="search"
        type="text"
        placeholder="Filter assignees"
        class="w-full p-2 border-b outline-none"
      />

      <!-- Options -->
      <div v-if="filteredAssignees.length">
        <div
          v-for="assignee in filteredAssignees"
          :key="assignee.username"
          @click="selectAssignee(assignee)"
          class="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-100"
        >
          <img :src="assignee.avatar" class="w-6 h-6 rounded-full" />
          <div>
            <div class="text-sm font-medium">{{ assignee.username }}</div>
            <div class="text-xs text-gray-500">{{ assignee.name }}</div>
          </div>
        </div>
      </div>
      <div v-else class="px-4 py-2 text-gray-400">No assignees found</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const open = ref(false)
const search = ref('')
const selected = ref(null)

const toggleDropdown = () => {
  open.value = !open.value
}

const selectAssignee = (user) => {
  selected.value = user
  open.value = false
}

const assignees = ref([
  {
    username: 'saifuddin24',
    name: 'Saif Uddin',
    avatar: 'https://via.placeholder.com/32x32.png?text=S',
  },
  {
    username: 'Abidur-Rahman-CSE',
    name: 'Abidur Rahman',
    avatar: 'https://via.placeholder.com/32x32.png?text=A',
  },
  {
    username: 'imt1az',
    name: 'Imtiaz Ahmed Chowdhury',
    avatar: 'https://via.placeholder.com/32x32.png?text=I',
  },
  {
    username: 'medigeneowner',
    name: 'Medigene Owner',
    avatar: 'https://via.placeholder.com/32x32.png?text=M',
  },
  // Add more as needed...
])

const filteredAssignees = computed(() =>
  assignees.value.filter(
    (a) =>
      a.username.toLowerCase().includes(search.value.toLowerCase()) ||
      a.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
)
</script>

<style scoped>
/* Optional: Add custom scrollbar styles */
</style>
