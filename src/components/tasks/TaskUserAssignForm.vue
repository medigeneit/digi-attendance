<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import UserChip from '@/components/user/UserChip.vue'
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useTaskStore } from '@/stores/useTaskStore'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref } from 'vue'

const taskStore = useTaskStore()
const companyStore = useCompanyStore()
const userStore = useUserStore()
const auth = useAuthStore()
const selectedUsers = ref([])
const user_ids = computed(() => selectedUsers.value.map((u) => u.id))
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
  state.value = ''
})

const userOptions = computed(() => {
  return users.value.filter((u) => {
    return !selectedUsers.value.find((selectedUser) => selectedUser.id === u.id)
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

const setting_editable = computed(() => {
  return Object.values(editable.value).reduce((status, value) => value || status, false)
})

const is_regular_task = computed({
  set: () => {
    form.value.is_important = false
    form.value.is_urgent = false
  },
  get: () => {
    return !(form.value.is_important || form.value.is_urgent)
  },
})

const editable = computed(() => {
  let _editable = {
    is_important: false,
    is_urgent: false,
    is_target: false,
    started_at: false,
    deadline: false,
  }

  if (auth.user.role === 'employee') {
    return _editable
  }

  _editable.is_important = auth.isAdminMood
  _editable.is_urgent = auth.isAdminMood
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

    <form v-else @submit.prevent="submit">
      <div class="mb-4">
        <label class="block uppercase text-xs text-gray-600">Employees</label>

        <MultiselectDropdown
          v-model="selectedUsers"
          :options="userOptions"
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
                    @click.prevent="selectedUsers = selectedUsers.filter((su) => su.id !== user.id)"
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

      <h3 class="my-6 text-center w-full relative" v-if="setting_editable">
        <div class="inline-block bg-white px-4">
          <b class="fas fa-cog text-gray-400"></b>
          <span class="text-gray-700 ml-2">Task Settings for Employee</span>
        </div>
        <hr class="bottom-0 border-gray-300 -mt-3" />
      </h3>

      <div class="flex gap-16 items-center mb-8">
        <label
          v-if="editable.is_important && editable.is_urgent"
          class="border px-2 py-0.5 rounded cursor-pointer"
          :class="{
            'border-blue-500 bg-green-200': is_regular_task,
            'bg-gray-50 hover:bg-green-50': !is_regular_task,
          }"
        >
          <div class="flex gap-1 items-center">
            <input
              type="checkbox"
              v-model="is_regular_task"
              class="size-4"
              :disabled="is_regular_task"
            />
            <span class="block text-gray-600 text-base font-medium">Regular Task</span>
          </div>
          <div class="text-sm text-gray-500">Usually: 1-30 Days</div>
        </label>

        <label
          v-if="editable.is_important"
          class="border px-2 py-0.5 rounded cursor-pointer"
          :class="{
            'border-yellow-500 bg-yellow-200': form.is_important,
            'bg-gray-50 hover:bg-yellow-50': !form.is_important,
          }"
        >
          <div class="flex gap-1 items-center">
            <input type="checkbox" v-model="form.is_important" class="size-4" />
            <span class="block text-gray-600 text-base font-medium">Important Task</span>
          </div>
          <div class="text-sm text-gray-500">Usually: 1-7 Days</div>
        </label>

        <label
          v-if="editable.is_urgent"
          class="border px-2 py-0.5 rounded cursor-pointer"
          :class="{
            'border-red-500 bg-red-200': form.is_urgent,
            'bg-gray-50 hover:bg-red-50': !form.is_urgent,
          }"
        >
          <div class="flex gap-1 items-center">
            <input type="checkbox" v-model="form.is_urgent" class="size-4" />
            <span class="block text-gray-600 text-base font-medium">Urgent Task</span>
          </div>
          <div class="text-sm text-gray-500">Usually: 1-3 Days</div>
        </label>
      </div>

      <div class="mt-8" v-if="editable.is_target">
        <label
          class="flex gap-1 items-center mt-4 border rounded py-2 px-2 cursor-pointer"
          :class="{ 'bg-yellow-100/80 border-yellow-300': form.is_target }"
        >
          <input type="checkbox" v-model="form.is_target" class="size-6" />
          <span class="block text-gray-600 text-base font-medium">Is Target Task</span>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4 mt-12">
        <div class="mb-4" v-if="editable.started_at">
          <label class="block text-gray-600 text-sm mb-1 font-medium"> Start Date </label>
          <input
            v-model="form.started_at"
            type="date"
            placeholder="Enter Start Date"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4" v-if="editable.deadline">
          <label class="block text-gray-600 text-sm mb-1 font-medium"> Deadline </label>
          <input
            v-model="form.deadline"
            type="date"
            placeholder="Enter Start Date"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div
        class="flex justify-between items-center gap-4 sticky bottom-0 bg-white border-t px-4 -mx-4 py-3"
      >
        <div v-if="error" class="mb-4 text-red-500 font-medium">
          {{ error }}
        </div>
        <div v-if="state == 'submitting'" class="mb-4 text-blue-500 font-medium">
          Saving changes...
        </div>
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
    </form>
  </div>
</template>
