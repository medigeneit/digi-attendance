<script setup>
import RequiredIcon from '@/components/RequiredIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'

// import { useTaskStore } from '@/stores/useTaskStore'
import { findRequirement } from '@/services/requirement'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, ref, watch } from 'vue'
import CompanyDepartmentSelectInput from '../common/CompanyDepartmentSelectInput.vue'
import SectionLoading from '../common/SectionLoading.vue'
import TextWithHr from '../TextWithHr.vue'
import IsTargetTaskInput from './IsTargetTaskInput.vue'
import TaskUrgencyInput from './TaskUrgencyInput.vue'

const props = defineProps({
  parentTaskId: {
    type: [Number, String],
    required: true,
  },
  requirementId: {
    type: [Number, String],
  },

  defaultValues: {
    type: Object,
    default: () => {},
  },
  readonlyFields: {
    type: Object,
    default: () => {},
  },
})

const emit = defineEmits(['taskCreated', 'close', 'error', 'ok'])

const store = useTaskStore()
const auth = useAuthStore()
const companyStore = useCompanyStore()
const task = ref()
const selectedUser = ref([])
const user_ids = computed(() => selectedUser.value.map((u) => u.id))

const state = ref('')
const requirement = ref()

const assign_type = ref(null)

const form = ref({
  title: '',
  from_department_id: '',
  to_department_id: '',
  user_ids: [],
  priority: 0,
  status: 'PENDING',
  description: '',
  is_important: false,
  is_urgent: false,
  assigned_at: null,
  deadline: null,
})

watch(user_ids, (val) => {
  form.value.user_ids = val
})

watch(
  () => props.defaultValues,
  (defaults) => {
    form.value = { ...defaults }
  },
  { immediate: true },
)

onMounted(async () => {
  state.value = 'loading'
  await companyStore.fetchCompanies({
    with: 'departments',
    ignore_permission: true,
  })
  state.value = ''
})

watch(
  () => ({  requirement: props.requirementId }),
  async () => {

    if (props.requirementId > 0) {
      console.log({ id: props.requirementId })
      requirement.value = (
        await findRequirement(props.requirementId)
      )?.data?.requirement
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
  state.value = 'submitting'

  const payload = {
    ...form.value,
    parent_id: task?.value?.id || 0,
    requirement_id: requirement?.value?.id || null,
  }

  try {
    const taskResponse = await store.createTask(payload, { loadingBeforeCreate: false })
    emit('taskCreated', taskResponse)
    state.value = 'taskCreated'
  } catch (err) {
    emit('error', store.error)
    state.value = 'taskCreatingError'
  }
}
</script>

<template>
  <div
    class="max-h-[90vh] overflow-auto max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6 pb-0 pt-0 relative"
  >
    <div class="sticky top-0 pt-4 bg-white z-10">
      <h2 class="text-xl font-semibold text-gray-800">
        <span v-if="requirementId && requirement?.title">Add Task to Requirement</span>
        <span v-else> Add Task  </span>
      </h2>

      <hr class="mb-4" />

      <div
        class="text-purple-600/80 mb-4 text-xs border-b border-dashed"
        @click.prevent="emit('ok')"
      >
        Fields that must be filled in will be marked with an asterisk.
      </div>
    </div>

    <form @submit.prevent="submit" class="z-0">


      <p class="mt-2 mb-6" v-if="requirementId && requirement?.title" :title="requirement.title">
        <div class="text-sm">
          Requirement
        </div>
        <div class="text-sky-600  border rounded px-4 py-2">
          <p class="line-clamp-1 ">
            {{ requirement.title }}
          </p>
        </div>
      </p>

      <p class="mt-2 mb-6" v-if="parentTaskId && task?.title">
        Sub task under <span class="text-sky-600">{{ task.title }}</span>
      </p>

      <div class="hidden">
        {{ assign_type }}
      </div>

      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium">
          Task Title <RequiredIcon />
        </label>
        <input
          v-model="form.title"
          required
          :placeholder="
            parentTaskId && task?.title ? 'Add Sub Task Title' : 'Enter main task/project title'
          "
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <template v-if="state !== 'loading' && !(parentTaskId && task?.title)">
        <CompanyDepartmentSelectInput
          v-model="form.from_department_id"
          :companies="companyStore?.companies || []"
          class="mb-4"
          :className="{ select: 'h-10' }"
          :disabled="readonlyFields?.from_department_id"
        >
          <template #label>
            <label class="block text-gray-600 text-sm mb1 font-medium">
              From Department <RequiredIcon />
            </label>
          </template>
        </CompanyDepartmentSelectInput>

        <CompanyDepartmentSelectInput
          v-model="form.to_department_id"
          :companies="companyStore?.companies || []"
          :disabled="readonlyFields?.to_department_id"
          class="mb-4"
          :className="{ select: 'h-10' }"
        >
          <template #label>
            <label class="block text-gray-600 text-sm mb-1 font-medium">
              To Department<RequiredIcon />
            </label>
          </template>
        </CompanyDepartmentSelectInput>
      </template>

      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium">Description</label>
        <textarea
          v-model="form.description"
          rows="4"
          placeholder="Enter task description"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>

      <template v-if="auth.user?.role != 'employee' && auth.isAdminMood">
        <TextWithHr class="mb-6">
          <div class="px-2">
            <b class="fas fa-cog text-gray-400"></b>
            <span class="text-gray-700 ml-2">Task Settings for Employee</span>
          </div>
        </TextWithHr>

        <TaskUrgencyInput
          class="mb-6"
          v-model:isImportant="form.is_important"
          v-model:isUrgent="form.is_urgent"
        />

        <IsTargetTaskInput v-model="form.is_target" class="mb-6" />

        <div class="grid grid-cols-2 gap-4 mb-4 mt-4">
          <div class="mb-4">
            <label class="block text-gray-600 text-sm mb-1 font-medium">Assign Date</label>
            <input
              v-model="form.assigned_at"
              type="date"
              placeholder="Enter Start Date"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="mb-4">
            <label class="block text-gray-600 text-sm mb-1 font-medium">Deadline</label>
            <input
              v-model="form.deadline"
              type="date"
              placeholder="Enter Start Date"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </template>

      <slot name="before-form-button"></slot>

      <div class="sticky bottom-0 bg-white py-4 border-t -mx-6 px-6">
        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>
        <hr v-if="store.error" class="mb-4" />

        <div class="flex items-center justify-between gap-4">
          <button
            :disabled="state == 'loading' || state == 'submitting'"
            type="submit"
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ state == 'submitting' ? 'Saving...' : 'Save Task' }}
          </button>

          <button
            type="button"
            @click.prevent="emit('close')"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
    <SectionLoading v-if="state === 'loading' || state === 'submitting'" />
  </div>
</template>
