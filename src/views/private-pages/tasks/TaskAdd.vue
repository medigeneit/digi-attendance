<script setup>
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import { useUserStore } from '@/stores/user'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()
const route = useRoute()
const router = useRouter()
const requirementStore = useRequirementStore()
const userStore = useUserStore()

const { requirement } = storeToRefs(requirementStore)
const { users } = storeToRefs(userStore)
const { task } = storeToRefs(store)
const { taskListTree } = storeToRefs(store)
const { flattenedTasks } = storeToRefs(store)

const selectedUser = ref([])
const user_ids = computed(() => selectedUser.value.map((u) => u.id))

const form = ref({
  title: '',
  user_ids: [],
  priority: 'MEDIUM',
  status: 'PENDING',
  description: '',
  is_important: false,
  is_urgent: false,
})

watch(user_ids, (val) => {
  form.value.user_ids = val
})

onMounted(() => {
  requirementStore.fetchRequirements()
  // userStore.fetchUsers()
  if (route.query?.parent_id > 0) {
    store.fetchTask(route.query?.parent_id)
  }

  if (route.query?.requirement_id > 0) {
    requirementStore.fetchRequirement(route.query?.requirement_id)
  }
})
</script>

<template>
  <div class="container mx-auto p-6">
    <TaskAddForm
      :parentTaskId="Number(route.query?.parent_id)"
      :requirementId="Number(route.query?.requirement_id)"
      @created="router.push({ name: 'TaskList' })"
      @close="router.push({ name: 'TaskList' })"
    />
  </div>
</template>
