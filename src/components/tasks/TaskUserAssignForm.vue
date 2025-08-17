<script setup>
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, ref } from 'vue'
import TextWithHr from '../TextWithHr.vue'
import IsTargetTaskInput from './IsTargetTaskInput.vue'
import TaskAssignUserInput from './TaskAssignUserInput.vue'
import TaskUrgencyInput from './TaskUrgencyInput.vue'
import TaskUserChip from './TaskUserChip.vue'

const taskStore = useTaskStore()
const auth = useAuthStore()
const selectedUsers = ref([])
const user_ids = computed(() => selectedUsers.value.map((u) => u.id))
// const taskId = route.params.id
const state = ref('')
const error = ref(null)
const employees = ref([])
const supervisor_ids = computed(() => selectedSupervisors.value.map((u) => u.id))
const selectedSupervisors = ref([])
const supervisors = ref([])

const props = defineProps({
  taskId: {
    type: [Number, String],
    required: true,
  },
})

const task = ref(null)

const form = ref(
  auth.user?.role == 'employee'
    ? {}
    : {
        is_important: false,
        is_urgent: false,
        is_target: false,
        assigned_at: '',
        deadline: '',
      },
)

const emit = defineEmits(['success', 'cancelClick'])

onMounted(async () => {
  state.value = 'loading'
  const taskData = await taskStore.fetchTask(
    props.taskId,
    {
      with_parent: 'true',
      with_department_users: 'true',
    },
    {
      loadingBeforeFetch: false,
      fetchOnly: true,
    },
  )

  task.value = taskData.task

  supervisors.value = task.value?.parent
    ? task.value.parent?.supervisors
    : taskData?.from_department_users || []

  employees.value = task.value?.parent
    ? task.value.parent?.users
    : taskData?.to_department_users || []

  // users.value = (await companyStore.fetchEmployees(auth.user?.company_id))?.data?.employees || []

  setTaskOnFormData(task.value)
  selectedUsers.value = task.value.users
  selectedSupervisors.value = task.value?.supervisors || []
  state.value = ''
})

const userIsSelected = (user) => {
  return selectedUsers.value.find((selectedUser) => selectedUser.id === user.id)
}

const supervisorIsSelected = (user) => {
  return selectedSupervisors.value.find((selectedUser) => selectedUser.id === user.id)
}

const employeeOptions = computed(() => {
  console.log('PARENT_USER', task.value?.parent?.users)

  return employees.value.filter((u) => {
    if (u.department_id === task.value?.to_department?.id) {
      return !userIsSelected(u)
    }
    return false
  })
})

const supervisorOptions = computed(() => {
  return supervisors.value.filter((u) => {
    if (u.department_id === task.value?.from_department?.id) {
      return !supervisorIsSelected(u)
    }
    return false
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
  form.value =
    auth.user?.role == 'employee'
      ? {}
      : {
          is_important: taskData.is_important,
          is_urgent: taskData.is_urgent,
          is_target: taskData.is_target,
          assigned_at: getYearMonthDayFormat(taskData.assigned_at),
          deadline: getYearMonthDayFormat(taskData.deadline),
        }
}
const taskFormContainerRef = ref()
</script>

<template>
  <div class="px-4 max-h-[90vh] overflow-auto rounded" ref="taskFormContainerRef">
    <div class="sticky top-0 bg-white z-20">
      <h2 class="text-xl font-semibold text-gray-800 mb-1 mt-4">Manage Employee(s) for Task</h2>
      <h3 class="mb-2 font-semibold text-gray-600 text-sm leading-none">
        {{ task?.title }}
      </h3>
      <hr class="mb-4 !mt-0" />
    </div>

    <div v-if="state === 'loading'" class="text-center text-gray-500 py-4">Loading users...</div>

    <form v-else @submit.prevent="submit" class="grid grid-cols-4 gap-4">
      <div class="col-span-2 flex flex-col">
        <div class="mb-4" v-if="task?.from_department">
          <div class="text-sm text-gray-500">Task From Department</div>
          <div class="text-base">
            {{ task?.from_department?.name }}
          </div>
        </div>

        <label class="block uppercase text-xs text-gray-600"> Supervisors </label>

        <TaskAssignUserInput
          :employees="supervisorOptions"
          list-type="supervisor"
          v-if="auth?.user?.role !== 'employee' && auth.isAdminMood"
          :isRemovable="true"
          v-model="selectedSupervisors"
          class="flex-grow"
        />

        <div
          v-else
          class="flex gap-x-3 gap-y-4 flex-wrap border p-2 rounded items-center flex-grow justify-center"
        >
          <template v-if="(selectedSupervisors || []).length > 0">
            <TaskUserChip
              v-for="user in selectedSupervisors"
              :key="user.id"
              :user="user"
            ></TaskUserChip>
          </template>
          <div v-else class="text-center w-full text-sm text-gray-400 py-2">
            No Supervisor assigned
          </div>
          <!-- {{ supervisors }} -->
        </div>
      </div>
      <div class="col-span-2 flex justify-center">
        <div class="w-full">
          <div class="mb-4" v-if="task?.to_department">
            <div class="text-sm text-gray-500">Task To Department</div>
            <div class="text-base">
              {{ task?.to_department?.name }}
            </div>
          </div>

          <label class="block uppercase text-xs text-gray-600"> Employees </label>
          <TaskAssignUserInput :employees="employeeOptions" v-model="selectedUsers" />
          <!-- :form-container-ref="taskFormContainerRef" -->
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
          v-model:isImportant="form.is_important"
          v-model:isUrgent="form.is_urgent"
        />

        <IsTargetTaskInput v-model="form.is_target" class="col-span-full md:col-span-2 mt-4" />

        <div class="flex items-end col-span-full md:col-span-2 gap-4">
          <div class="w-1/2">
            <label class="block text-gray-600 text-sm mb-1 font-medium">Starting</label>
            <input
              v-model="form.assigned_at"
              type="date"
              placeholder="Enter Start Date"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="w-1/2">
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
