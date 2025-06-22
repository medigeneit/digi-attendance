<script setup>
import RequiredIcon from '@/components/RequiredIcon.vue'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import SectionLoading from '../common/SectionLoading.vue'

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
const task = ref()
const selectedUser = ref([])
const user_ids = computed(() => selectedUser.value.map((u) => u.id))

const state = ref('')

const form = ref({
  title: '',
  user_ids: [],
  priority: 0,
  status: 'PENDING',
  description: '',
  is_important: false,
  is_urgent: false,
})

watch(user_ids, (val) => {
  form.value.user_ids = val
})

onMounted(async () => {
  state.value = ''
})

watch(
  () => ({ parentTaskId: props.parentTaskId, requirement: props.requirementId }),
  async () => {
    if (props.requirementId > 0) {
      await requirementStore.fetchRequirement(props.requirementId)
    }
    if (props.parentTaskId > 0) {
      task.value = (
        await store.fetchTask(
          props.parentTaskId,
          {},
          { loadingBeforeFetch: false, fetchOnly: true },
        )
      )?.task

      console.log({ t: task.value })
    }
    state.value = 'initialized'
  },
  {
    initial: true,
    immediate: true,
  },
)

async function submit() {
  state.value = 'loading'

  const payload = {
    ...form.value,
    parent_id: task?.value?.id || 0,
    requirement_id: requirement?.value?.id || null,
  }

  try {
    await store.createTask(payload, { loadingBeforeCreate: false })
    emit('taskCreated')
    state.value = 'taskCreated'
  } catch (err) {
    console.log({ err })
    emit('error', store.error)
    state.value = 'taskCreatingError'
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6 relative">
    <SectionLoading v-if="state == 'loading'" />
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
        Sub task under <span class="text-sky-600">{{ task.title }}</span>
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

      <div class="grid grid-cols-2 gap-4 mb-4">
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

      <div class="grid grid-cols-2 gap-4 mb-4 mt-12">
        <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">
            Start Date <RequiredIcon />
          </label>
          <input
            v-model="form.started_at"
            type="date"
            placeholder="Enter Start Date"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">
            Deadline <RequiredIcon />
          </label>
          <input
            v-model="form.deadline"
            type="date"
            placeholder="Enter Start Date"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
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
          :disabled="state == 'loading'"
          type="submit"
          class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded transition"
        >
          {{ state == 'loading' ? 'Saving...' : 'Save Task' }}
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
