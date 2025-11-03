<script setup>
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import TextWithHr from '../TextWithHr.vue'
import IsTargetTaskInput from './IsTargetTaskInput.vue'
import TaskAssignEmployeeInput from './TaskAssignEmployeeInput.vue'
import TaskUrgencyInput from './TaskUrgencyInput.vue'
import TaskUserChip from './TaskUserChip.vue'

const taskStore = useTaskStore()
const auth = useAuthStore()
const selectedUsers = ref([])
// const taskId = route.params.id
const state = ref('')
const error = ref(null)
const employees = ref([])
const selectedSupervisors = ref([])

const props = defineProps({
  taskId: {
    type: [Number, String],
    required: true,
  },
})

const userStore = useUserStore()
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

  employees.value = taskData?.to_department_users || []

  setTaskOnFormData(task.value)
  selectedUsers.value = task.value.users
  selectedSupervisors.value = task.value?.supervisors || []
  state.value = ''
})

const employeeOptions = computed(() => {
  return [...employees.value, ...(task.value?.users?.length ? [...task.value.users] : [])]
})

const supervisorOptions = computed(() => {
  const supervisors = userStore.users || []
  return [...supervisors, ...(task.value?.supervisors?.length ? [...task.value.supervisors] : [])]
})

const submit = async () => {
  state.value = 'submitting'
  error.value = null

  try {
    await taskStore.updateTask(props.taskId, form.value, { loadingBeforeFetch: false })
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
      ? { user_ids: task.value.users?.map((u) => u.id) }
      : {
          is_important: taskData.is_important,
          is_urgent: taskData.is_urgent,
          is_target: taskData.is_target,
          assigned_at: getYearMonthDayFormat(taskData.assigned_at),
          deadline: getYearMonthDayFormat(taskData.deadline),
          user_ids: task.value.users?.map((u) => u.id),
          supervisor_ids: task.value.supervisors?.map((u) => u.id),
        }
}
const taskFormContainerRef = ref()
onMounted(async () => {
  await userStore.fetchTypeWiseEmployees({ type: 'academy_body,doctor,executive' })
})
</script>

<template>
  <div class="px-4 rounded border max-h-[98vh] overflow-auto" ref="taskFormContainerRef">
    <div class="bg-white z-20 sticky top-0 -mx-4 px-4">
      <h2 class="text-xl font-semibold text-gray-800 mb-1 mt-4">Manage Employee(s) for Task</h2>

      <hr class="mb-4 !mt-0" />
      <h3 class="col-span-full mb-2 font-semibold text-gray-800 text-sm line-clamp-3 mb-4">
        {{ task?.title }}
      </h3>
    </div>

    <form @submit.prevent="submit" class="relative min-h-40">
      <div class="min-h-[150px]">
        <LoaderView v-if="state === 'loading'" class="absolute inset-0 border-0 shadow-none" />
        <div v-else class="grid grid-cols-4 gap-8 mb-4 items-stretch">
          <div class="col-span-2 flex flex-col">
            <div class="mb-4" v-if="task?.from_department">
              <div class="text-sm text-gray-500">Task From Department</div>
              <div class="text-base">
                {{ task?.from_department?.name }}
              </div>
            </div>

            <label class="block uppercase text-xs text-gray-600"> Supervisors </label>

            <TaskAssignEmployeeInput
              :employees="supervisorOptions"
              list-type="supervisor"
              v-if="auth?.user?.role !== 'employee' && auth.isAdminMood"
              :isRemovable="true"
              v-model="form.supervisor_ids"
              class="flex-grow"
              placeholder="--No Supervisor assigned--"
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

          <div class="col-span-2 w-full flex flex-col">
            <div class="mb-4" v-if="task?.to_department">
              <div class="text-sm text-gray-500">Task To Department</div>
              <div class="text-base">
                {{ task?.to_department?.name }}
              </div>
            </div>

            <label class="block uppercase text-xs text-gray-600"> Employees </label>
            <!-- <SelectDropdown :options="employeeOptions" v-model="form.user_ids" multiple /> -->
            <TaskAssignEmployeeInput
              :employees="employeeOptions"
              v-model="form.user_ids"
              class="flex-grow"
              placeholder="--No employee(s) assigned--"
            />
            <!-- :form-container-ref="taskFormContainerRef" -->
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
                <label class="block text-gray-600 text-sm mb-1 font-medium">Assign Date</label>
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
        </div>
      </div>

      <div class="bg-white border-t px-4 -mx-4 py-4 sticky bottom-0">
        <div v-if="error" class="mb-4 text-red-500 font-medium">
          {{ error }}
        </div>
        <div v-if="state == 'submitting'" class="mb-4 text-blue-500 font-medium">
          Saving changes...
        </div>
        <div class="flex justify-between items-center gap-4">
          <!-- {{ form }} -->
          <button type="button" @click="emit('cancelClick')" class="btn-3">Cancel</button>
          <button
            :disabled="state == 'submitting' || state == 'loading'"
            type="submit"
            class="btn-2"
          >
            {{ state == 'submitting' ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
