<script setup>
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useTaskStore } from '@/stores/useTaskStore'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref } from 'vue'
import TextWithHr from '../TextWithHr.vue'
import IsTargetTaskInput from './IsTargetTaskInput.vue'
import TaskAssignUserInput from './TaskAssignUserInput.vue'
import TaskUrgencyInput from './TaskUrgencyInput.vue'
import TaskUserChip from './TaskUserChip.vue'

const taskStore = useTaskStore()
const companyStore = useCompanyStore()
const userStore = useUserStore()
const auth = useAuthStore()
const selectedUsers = ref([])
const selectedSupervisors = ref([])
const user_ids = computed(() => selectedUsers.value.map((u) => u.id))
const supervisor_ids = computed(() => selectedSupervisors.value.map((u) => u.id))
// const taskId = route.params.id
const state = ref('')
const error = ref(null)
const users = ref([])

const props = defineProps({
  taskId: {
    type: [Number, String],
    required: true,
  },
})

const task = ref(null)

const form = ref({
  ...(auth.user?.role == 'employee'
    ? {}
    : {
        is_important: false,
        is_urgent: false,
        is_target: false,
        started_at: '',
        deadline: '',
      }),
})

const emit = defineEmits(['success', 'cancelClick'])

onMounted(async () => {
  state.value = 'loading'
  const taskData = await taskStore.fetchTask(
    props.taskId,
    { with_parent: 'true' },
    {
      loadingBeforeFetch: false,
      fetchOnly: true,
    },
  )

  task.value = taskData.task

  if (task.value.parent) {
    users.value = task.value?.parent?.users || []
  } else {
    if (auth.user?.role === 'employee') {
      users.value =
        (await companyStore.fetchEmployees(auth.user?.company_id))?.data?.employees || []
    } else {
      await userStore.fetchUsers() // all available users
      users.value = userStore.users
    }
  }

  setTaskOnFormData(task.value)
  selectedUsers.value = task.value.users
  selectedSupervisors.value = task.value?.supervisors || []
  state.value = ''
})

const employees = computed(() => {
  // return users.value.filter((u) => {
  //   return !selectedUsers.value.find((selectedUser) => selectedUser.id === u.id)
  // })

  return users.value.filter((u) => {
    const selected = selectedUsers.value.find((selectedUser) => selectedUser.id === u.id)

    if (u.department_id == task.value?.to_department?.id) {
      return true && !selected
    }
    return false
  })
})

const supervisors = computed(() => {
  return users.value.filter((u) => {
    return !selectedSupervisors.value.find((selectedUser) => selectedUser.id === u.id)
  })
})

const submit = async () => {
  state.value = 'submitting'
  error.value = null

  try {
    await taskStore.updateTask(
      props.taskId,
      {
        ...form.value,
        user_ids: user_ids.value,
        supervisor_ids: supervisor_ids.value,
      },
      { loadingBeforeFetch: false },
    )
    // await taskStore.assignUsers(props.taskId, user_ids.value, { updateStoreData: false })
    emit('success')
  } catch (err) {
    error.value = err.response?.data?.message || 'Assign users failed'
  } finally {
    state.value = ''
  }
}

function setTaskOnFormData(taskData) {
  form.value = {
    ...(auth.user?.role == 'employee'
      ? {}
      : {
          is_important: taskData.is_important,
          is_urgent: taskData.is_urgent,
          is_target: taskData.is_target,
          started_at: getYearMonthDayFormat(taskData.started_at),
          deadline: getYearMonthDayFormat(taskData.deadline),
        }),
  }
}

const editable = computed(() => {
  let _editable = {
    urgency: false,
    is_target: false,
    started_at: false,
    deadline: false,
  }

  if (auth.user.role === 'employee') {
    return _editable
  }

  _editable.urgency = auth.isAdminMood
  _editable.is_target = auth.isAdminMood
  _editable.started_at = auth.isAdminMood
  _editable.deadline = auth.isAdminMood

  return _editable
})
</script>

<template>
  <div class="px-4 max-h-[90vh] overflow-auto rounded">
    <div class="sticky top-0 bg-white z-20">
      <h2 class="text-xl font-semibold text-gray-800 mb-1 mt-4">Manage Employee(s) for Task</h2>
      <h3 class="mb-2 font-semibold text-gray-600 text-sm leading-none">
        {{ task?.title }}
      </h3>
      <hr class="mb-4 !mt-0" />
    </div>

    <div v-if="state === 'loading'" class="text-center text-gray-500 py-4">Loading users...</div>

    <form v-else @submit.prevent="submit" class="grid grid-cols-4 gap-4">
      <div class="col-span-2">
        <div class="mb-4" v-if="task?.from_department">
          <div class="text-sm text-gray-500">Task From Department</div>
          <div class="text-base">
            {{ task?.from_department?.name }}
          </div>
        </div>

        <label class="block uppercase text-xs text-gray-600"> Supervisors </label>
        <TaskAssignUserInput
          :employees="supervisors"
          list-type="supervisor"
          v-if="auth?.user?.role !== 'employee' && auth.isAdminMood"
          v-model="selectedSupervisors"
        />
        <div v-else class="flex gap-2">
          <TaskUserChip
            v-for="user in selectedSupervisors"
            :key="user.id"
            :user="user"
          ></TaskUserChip>
          <!-- {{ supervisors }} -->
        </div>
      </div>
      <div class="mb-4 col-span-2 flex justify-center">
        <div class="max-w-sm w-full">
          <div class="mb-4" v-if="task?.to_department">
            <div class="text-sm text-gray-500">Task To Department</div>
            <div class="text-base">
              {{ task?.to_department?.name }}
            </div>
          </div>

          <label class="block uppercase text-xs text-gray-600"> Employees </label>
          <TaskAssignUserInput :employees="employees" v-model="selectedUsers" />
        </div>
      </div>

      <template v-if="auth?.user?.role !== 'employee' && auth.isAdminMood">
        <TextWithHr class="col-span-full">
          <div class="px-2">
            <b class="fas fa-cog text-gray-400"></b>
            <span class="text-gray-700 ml-2">Task Settings for Employee</span>
          </div>
        </TextWithHr>

        <TaskUrgencyInput
          class="col-span-full"
          v-if="editable.urgency"
          v-model:isImportant="form.is_important"
          v-model:isUrgent="form.is_urgent"
        />

        <IsTargetTaskInput
          v-model="form.is_target"
          class="col-span-full md:col-span-2 mt-4"
          v-if="editable.is_target"
        />

        <div class="flex items-end col-span-full md:col-span-2 gap-4">
          <div class="w-1/2" v-if="editable.started_at">
            <label class="block text-gray-600 text-sm mb-1 font-medium">Start Date</label>
            <input
              v-model="form.started_at"
              type="date"
              placeholder="Enter Start Date"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="w-1/2" v-if="editable.deadline">
            <label class="block text-gray-600 text-sm mb-1 font-medium"
              >{{ form.is_target ? 'Target' : '' }} Deadline</label
            >
            <input
              v-model="form.deadline"
              type="date"
              placeholder="Enter Start Date"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </template>
      <div class="sticky bottom-0 bg-white border-t px-4 -mx-4 py-3 col-span-full">
        <div v-if="error" class="mb-4 text-red-500 font-medium">
          {{ error }}
        </div>
        <div v-if="state == 'submitting'" class="mb-4 text-blue-500 font-medium">
          Saving changes...
        </div>
        <div class="flex justify-between items-center gap-4">
          <!-- {{ form }} -->
          <button
            :disabled="state == 'submitting' || state == 'loading'"
            type="submit"
            class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ state == 'submitting' ? 'Saving...' : 'Save' }}
          </button>

          <button
            type="button"
            @click="emit('cancelClick')"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
