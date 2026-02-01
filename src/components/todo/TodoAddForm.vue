<script setup>
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useTodoProjectStore } from '@/stores/useTodoProjectStore'
import { useTodoStore } from '@/stores/useTodoStore'
import { nextTick, onMounted, ref, watch } from 'vue'
import FormHandler from '../FormHandler.vue'
import InputWithSuggestions from '../InputWithSuggestions.vue'
import LoaderView from '../common/LoaderView.vue'
import TodoTypeInput from './TodoTypeInput.vue'

const props = defineProps({
  date: { type: String, default: getYearMonthDayFormat(new Date()) },
  userRole: { type: String, default: 'employee' },
  todoType: { type: String, default: 'task' },
  todoTypeId: { type: String, default: null },
  readonlyValues: {
    type: Object,
    default: () => ({
      date: false,
      todo_type_id: false,
    }),
  },
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
  date: props.date || '',
  todo_type: 'task',
  todo_type_id: '',
})

async function handleFormSubmit() {
  try {
    state.value = 'submitting'

    const payload = { ...form.value }

    if (!payload.todo_type_id) {
      delete payload.todo_type_id
      delete payload.todo_type
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

    await todoStore.createTodo(payload, {
      returnWith: props.userRole !== 'employee' ? 'user,department,company' : '',
    })
    emit('update')
  } finally {
    state.value = ''
  }
}

watch(
  () => ({
    date: props.date,
    todo_type: props.todoType,
    todo_type_id: props.todoTypeId,
  }),
  (newValue) => {
    form.value = { ...form.value, ...newValue }
  },
  { immediate: true },
)

onMounted(async () => {
  await nextTick()
  titleRef.value?.focus()

  if (authStore.isAdminMood) {
    await companyStore.fetchMyCompanies({
      with: 'departments',
    })
  }

  await todoProjectStore.fetchProjects()
})
</script>

<template>
  <div @click="showTodoTypes = false">
    <LoaderView
      v-if="todoStore.loading"
      class="absolute inset-0 bg-opacity-80 text-center py-4 text-gray-500 z-10 flex items-center justify-center"
    >
      Loading...
    </LoaderView>

    <FormHandler
      @submit="handleFormSubmit"
      @clickCancel="emit('cancelClick')"
      :isSubmitting="state == 'submitting'"
      :error="todoStore.error"
      class="rounded-md relative"
    >
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Add Todo</h2>
      </div>

      <div class="p-4 min-h-[10vh] max-h-[50vh] overflow-y-auto">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-1 text-sm">Title</label>
          <input
            ref="titleRef"
            v-model="form.title"
            required
            placeholder="Enter todo title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-1 text-sm">Date</label>
          <input
            :readonly="readonlyValues?.date"
            v-model="form.date"
            type="date"
            required
            placeholder="Enter todo title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- <CompanyDepartmentSelectInput
          v-if="authStore.isAdminMood"
          v-model="selectedDepartmentId"
          :companies="companyStore?.myCompanies || []"
          class="mb-4"
        >
          <template #label>
            <label class="block text-gray-700 font-medium mb-1 text-sm">
              Project Department <span class="text-gray-500">(Optional - for new project)</span>
            </label>
          </template>
        </CompanyDepartmentSelectInput> -->

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-1 text-sm">
            Issue/Website/Project <span class="text-gray-500">(Optional)</span>
          </label>
          <InputWithSuggestions
            v-model="selectedProjectId"
            @update:inputValue="(val) => (projectInputValue = val)"
            :options="todoProjectStore.projects"
            label="title"
            value="id"
            placeholder="Select or type project..."
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-1 text-sm">Task (optional)</label>
          <TodoTypeInput
            v-model:show="showTodoTypes"
            v-model:todoType="form.todo_type"
            v-model:todoTypeId="form.todo_type_id"
            :readonly="readonlyValues?.todo_type_id"
          />
        </div>
      </div>
    </FormHandler>
  </div>
</template>
