<script setup>
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useTodoProjectStore } from '@/stores/useTodoProjectStore'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, nextTick, onMounted, ref } from 'vue'

import { deleteTodoSetting, findTodoSetting, upsertTodoSetting } from '@/services/todo'
import CompanyDepartmentSelectInput from '../common/CompanyDepartmentSelectInput.vue'
import LoaderView from '../common/LoaderView.vue'
import FormHandler from '../FormHandler.vue'
import InputWithSuggestions from '../InputWithSuggestions.vue'
import TodoTypeInput from './TodoTypeInput.vue'

// API helpers
// import {
//   findTodoSetting,
//   upsertTodoSetting, // new helper above
// } from '@/services/todoSettingService'

const props = defineProps({
  date: { type: String, default: getYearMonthDayFormat(new Date()) },
  todo: { type: Object, default: () => ({}) },
})

const state = ref()
const showTodoTypes = ref(false)
const titleRef = ref()
const todoStore = useTodoStore()
const todoProjectStore = useTodoProjectStore()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const selectedProjectId = ref(null)
const projectInputValue = ref('')
const selectedDepartmentId = ref(null)
const emit = defineEmits(['update', 'cancelClick'])

const form = ref({
  title: '',
  todo_type: 'task',
  todo_type_id: '',
})

// --- Recurrence setting state controlled by parent ---
const setting = ref({
  id: null,
  repeat_type: 'daily',
  start_date: props.todo?.date || props.date || getYearMonthDayFormat(new Date()),
  end_date: null,
  weekly_day: null,
  monthly_mode: null,
  monthly_value: null,
  monthly_week: null,
  yearly_month: null,
  yearly_day: null,
})

const hasTodoSetting = ref(false)

const settingRef = ref({}) // to call buildPayload()

async function fetchTodo() {
  await todoStore.fetchTodo(props.todo?.id)
  form.value.title = todoStore.todo?.title
  form.value.todo_type_id = todoStore.todo?.todoable_id
  selectedProjectId.value = todoStore.todo?.todo_project_id || null
}

const settingId = ref(null)

async function fetchSetting() {
  try {
    const { data } = await findTodoSetting(props.todo.id)
    const item = data?.setting
    if (item) {
      hasTodoSetting.value = true
      // hydrate
      settingId.value = item.id
      setting.value = {
        repeat_type: item.repeat_type ?? 'daily',
        start_date: item.start_date ?? setting.value.start_date,
        end_date: item.end_date ?? null,
        weekly_day: item.weekly_day ?? null,
        monthly_mode: item.monthly_mode ?? null,
        monthly_value: item.monthly_value ?? null,
        monthly_week: item.monthly_week ?? null,
        yearly_month: item.yearly_month ?? null,
        yearly_day: item.yearly_day ?? null,
      }
    } else {
      // keep defaults for creating new
      setting.value.id = null
    }
  } catch (e) {
    // optional: surface error in a toast
    settingsError.value = e?.response?.data?.message
    console.error('Load setting failed:', e?.message || e)
  }
}

async function submitTodo() {
  // 1) Update Todo
  const payload = {
    title: form.value.title,
    todo_type: form.value.todo_type,
    todo_type_id: form.value.todo_type_id,
  }

  if (selectedProjectId.value) {
    payload.todo_project_id = selectedProjectId.value
  } else if (projectInputValue.value) {
    const newProject = await todoProjectStore.createProject({
      title: projectInputValue.value,
      department_id: selectedDepartmentId.value,
    })
    payload.todo_project_id = newProject.id
  }

  await todoStore.updateTodo(props.todo.id, payload)
}

async function submitSettings() {
  if (!hasTodoSetting.value) {
    settingId.value ? await deleteTodoSetting(props.todo.id, settingId.value) : null
  } else {
    // 2) Build payload from fields component and UPSERT the setting
    const payload = settingRef.value?.buildPayload
      ? settingRef.value.buildPayload()
      : { ...setting.value }

    // (ensure start_date at least)
    if (!payload.start_date) {
      payload.start_date = props.todo?.date || props.date || getYearMonthDayFormat(new Date())
    }
    // console.log({ payload })
    await upsertTodoSetting(props.todo.id, payload)
  }
}

const getErrMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong'

async function handleFormSubmit() {
  const [todoRes, settingsRes] = await Promise.allSettled([submitTodo(), submitSettings()])

  const todoOk = todoRes.status === 'fulfilled'
  const settingsOk = settingsRes.status === 'fulfilled'

  if (!settingsOk) {
    settingsError.value = getErrMsg(settingsRes.reason)
  }

  if (todoOk && settingsOk) {
    emit('update') // parent can refresh list/modal
  }
}

const settingsLoading = ref(false)
const settingsError = ref(false)

async function loadEverything() {
  if (authStore.isAdminMood) {
    await companyStore.fetchMyCompanies({
      with: 'departments',
    })
  }
  todoProjectStore.fetchProjects()
  await fetchTodo()
  settingsLoading.value = true
  await fetchSetting()
  settingsLoading.value = false
  await nextTick()
  titleRef.value?.focus()
}

const isLoading = computed(() => {
  return todoStore.loading || settingsLoading.value
})

onMounted(() => {
  loadEverything()
})
</script>

<template>
  <div class="relative" @click="showTodoTypes = false">
    <LoaderView
      v-if="isLoading"
      class="absolute inset-0 bg-opacity-80 text-center py-4 text-gray-500 z-10 flex items-center justify-center"
    >
      Loading...
    </LoaderView>

    <FormHandler
      @submit="handleFormSubmit"
      @clickCancel="emit('cancelClick')"
      :isSubmitting="state == 'submitting'"
      :isLoading="isLoading"
      id="todoEditForm"
    >
      <template #error>
        <div>
          <div v-if="todoStore.error" class="mb-4 text-red-500 font-medium">
            {{ todoStore.error }}
          </div>
          <div v-if="settingsError" class="mb-4 text-red-500 font-medium">
            {{ settingsError }}
          </div>
        </div>
      </template>
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Edit Todo</h2>
      </div>

      <div class="p-4 min-h-[10vh] max-h-[50vh] overflow-y-auto">
        <div class="text-xs text-red-800 mb-6">
          <strong>Tips:</strong> If you change the todo, it will change to all the concurrent dates
        </div>

        <!-- <div class="mb-2">
          <span class="font-semibold"> Date </span>
          <span>{{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}</span>
        </div> -->

        <div class="mb-4">
          <label class="block text-gray-500 font-medium text-sm">Title</label>
          <input
            ref="titleRef"
            v-model="form.title"
            required
            placeholder="Enter todo title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <CompanyDepartmentSelectInput
          v-if="authStore.isAdminMood"
          v-model="selectedDepartmentId"
          :companies="companyStore?.myCompanies || []"
          class="mb-4"
        >
          <template #label>
            <label class="block text-gray-500 font-medium text-sm">
              Project Department <span class="text-gray-500">(Optional - for new project)</span>
            </label>
          </template>
        </CompanyDepartmentSelectInput>

        <div class="mb-4">
          <label class="block text-gray-500 font-medium text-sm">
            Issue/Website/Project <span class="text-gray-500">(Optional)</span>
          </label>

          <InputWithSuggestions
            v-model="selectedProjectId"
            @update:inputValue="(val) => (projectInputValue = val)"
            :options="todoProjectStore.projects"
            value="id"
            label="title"
            placeholder="Select or type project..."
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-500 font-medium text-sm">Task ID (optional)</label>
          <TodoTypeInput
            v-model:show="showTodoTypes"
            v-model:todoType="form.todo_type"
            v-model:todoTypeId="form.todo_type_id"
          />
        </div>

        <!-- Recurrence fields (NO own buttons; parent controls submit) -->
        <!--
        <div>
          <hr class="my-6" />

          <TodoSettingFields
            ref="settingRef"
            v-model="setting"
            v-model:hasSetting="hasTodoSetting"
          />
        </div>
        -->
      </div>
    </FormHandler>
  </div>
</template>
