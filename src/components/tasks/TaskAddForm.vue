<script setup>
import RequiredIcon from '@/components/RequiredIcon.vue'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  parentTaskId: {
    type: Number,
    required: true,
  },
  requirementId: {
    type: Number,
  },
})

const emit = defineEmits(['taskCreated', 'close', 'error', 'ok'])

const store = useTaskStore()
const requirementStore = useRequirementStore()
const { requirement } = storeToRefs(requirementStore)
const { task } = storeToRefs(store)

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

  if (props.parentTaskId > 0) {
    store.fetchTask(props.parentTaskId, {}, { loadingBeforeFetch: false })
  }

  if (props.requirementId > 0) {
    requirementStore.fetchRequirement(props.requirementId)
  }
})

const loading = ref(false)

async function submit() {
  loading.value = true

  const payload = {
    ...form.value,
    parent_id: task?.value?.id || 0,
    requirement_id: requirement?.value?.id || null,
  }
  console.log({ payload })

  try {
    await store.createTask(payload)
    emit('taskCreated')
  } catch (err) {
    console.log({ err })
    emit('error', store.error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6">
    <h2 class="text-2xl font-semibold text-gray-800">Add New Task</h2>

    <hr class="mb-4" />
    <div class="text-purple-600/60 mb-4 text-xs" @click.prevent="emit('ok')">
      Fields that must be filled in will be marked with an asterisk.
    </div>
    <form @submit.prevent="submit">
      <p class="text-center mt-2 mb-6" v-if="requirementId && requirement?.title">
        Task under requirement <span class="text-sky-600">{{ requirement.title }}</span>
      </p>
      <p class="text-center mt-2 mb-6" v-if="parentTaskId && task?.title">
        Sub task on <span class="text-sky-600">{{ task.title }}</span>
      </p>

      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium"
          >Task Title <RequiredIcon />
        </label>
        <input
          v-model="form.title"
          required
          placeholder="Enter task title"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="mb-4">
        <label class="flex gap-1 items-center">
          <input type="checkbox" v-model="form.is_important" class="size-4" />
          <span class="block text-gray-600 text-base pt-1 mb-1 font-medium">Important</span>
        </label>
        <label class="flex gap-1 items-center">
          <input type="checkbox" v-model="form.is_urgent" class="size-4" />
          <span class="block text-gray-600 text-base mb-1 font-medium">Urgent</span>
        </label>
      </div>

      <!-- <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">Parent Task: </label>
          <select
            id="parent-task"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            v-model="form.parent_id"
          >
            <option value="0" class="font-medium text-sm text-red-200">--- NO PARENT---</option>
            <option
              v-for="task in flattenedTasks"
              :key="task.idPath"
              :value="task.id"
              class="text-sm"
            >
              <template v-if="task.depth > 0">
                {{ '&nbsp;&nbsp;&nbsp;'.repeat(task.depth) }} ↳
              </template>
              {{ task.title }}
            </option>
          </select>
        </div> -->

      <!-- <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">Requirement </label>
          <MultiselectDropdown
            v-model="selectedRequirement"
            :options="requirements"
            :multiple="false"
            track-by="id"
            label="title"
            placeholder="Select department"
          />
        </div> -->

      <!-- <div>{{ tasks.map((t) => ({ id: t.id, title: t.title, parent_id: t.parent_id })) }}</div> -->
      <!-- <pre>{{ taskListTree }}</pre> -->

      <!-- <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">User</label>
          <MultiselectDropdown
            v-model="selectedUser"
            :options="users"
            :multiple="true"
            track-by="id"
            label="label"
            placeholder="Select users"
          />
        </div> -->

      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- <div>
            <label class="block text-gray-600 text-sm mb-1 font-medium"
              >Priority <RequiredIcon
            /></label>
            <select
              v-model="form.priority"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div> -->

        <div>
          <label class="block text-gray-600 text-sm mb-1 font-medium"
            >Status <RequiredIcon
          /></label>
          <select
            v-model="form.status"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">--select---</option>
            <option>PENDING</option>
            <option>IN_PROGRESS</option>
            <option>COMPLETED</option>
            <option>BLOCKED</option>
            <option>CANCELLED</option>
            <option>BACK_LOG</option>
          </select>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium">Description</label>
        <textarea
          v-model="form.description"
          rows="4"
          placeholder="Enter task description"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>

      <hr class="mb-4" />
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
          @click="emit('close')"
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
