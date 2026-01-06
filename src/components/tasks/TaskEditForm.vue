<script setup>
import { getYearMonthDayFormat } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useTagStore } from '@/stores/tags'
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted, ref, watch } from 'vue'
import SectionLoading from '../common/SectionLoading.vue'
import SelectDropdown from '../SelectDropdown.vue'
import TextEditor from '../TextEditor.vue'

const props = defineProps({
  taskId: {
    type: [String, Number],
    required: true,
  },
})

const emit = defineEmits(['updated', 'cancel'])

const store = useTaskStore()
const selectedWebsiteTags = ref([])
const tagStore = useTagStore()
const auth = useAuthStore()
const companyStore = useCompanyStore()
const task = ref()
const loading = ref(false)
const selectedUsers = ref([])
const errorMessage = ref('')
const form = ref({})

onMounted(async () => {
  loading.value = true

  tagStore.fetchTags('website')

  task.value = (
    await store.fetchTask(props.taskId, {}, { fetchOnly: true, loadingBeforeFetch: false })
  )?.task

  websiteTags.value = tagStore.tags
    .filter((t) => {
      return task.value?.website_tags?.some((st) => st.id === t.id) || false
    })
    .map((t) => t.id)

  await companyStore.fetchCompanies({
    with: 'departments',
    ignore_permission: true,
  })

  setTaskOnFormData(task.value)

  selectedWebsiteTags.value = task.value?.website_tags || []
  selectedUsers.value = task.value.users
  loading.value = false
})

watch(
  () => task.value,
  (newTask) => {
    setTaskOnFormData(newTask)
    selectedUsers.value = newTask.users
  },
)

function setTaskOnFormData(taskData) {
  form.value = {
    title: taskData.title,
    description: taskData.description,
    requirement_id: taskData.requirement_id,
    from_department_id: taskData.from_department_id,
    to_department_id: taskData.to_department_id,
    // status: taskData.status,
    ...(auth.user?.role !== 'employee'
      ? {
          is_important: taskData.is_important,
          is_urgent: taskData.is_urgent,
          is_target: taskData.is_target,
          started_at: getYearMonthDayFormat(taskData.started_at),
          deadline: getYearMonthDayFormat(taskData.deadline),
        }
      : {}),
  }
}

const update = async () => {
  loading.value = true

  try {
    const payload = {
      ...form.value,
      user_ids: selectedUsers.value?.map((u) => Number(u.id)) || [],
      website_tags: websiteTags.value?.map((tagId) => Number(tagId)) || [],
    }

    await store.updateTask(props.taskId, payload, { loadingBeforeFetch: false })
    emit('updated')
  } catch (err) {
    console.error(err)
    errorMessage.value = err.response?.data?.message || 'An error occurred while updating the task.'
  } finally {
    loading.value = false
  }
}

const websiteTags = ref([])
</script>

<template>
  <div class="px-4 max-h-[90vh] overflow-auto">
    <div class="sticky top-0 pt-4 -mx-4 px-4 border-b bg-white rounded-t-md">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Edit Task</h2>
      <div v-if="loading" class="text-center py-4 text-gray-500">Loading form...</div>
    </div>

    <!-- <pre>
      {{ tagStore.tags }}
    </pre> -->

    <form @submit.prevent="update" class="mt-4">
      <div class="mb-4">
        <label class="block text-gray-700 font-medium mb-2">Task Title</label>
        <input
          v-model="form.title"
          required
          placeholder="Enter task title"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="mb-4">
        <label class="text-gray-800">Websites</label>
        <SelectDropdown
          :options="tagStore.tags"
          key="id"
          label="name"
          v-model="websiteTags"
          :multiple="true"
          :clearable="true"
        />

        <!-- <MultiselectDropdown
          :options="tagStore.tags"
          :multiple="true"
          v-model="selectedWebsiteTags"
          label="name"
          track-by="name"
        /> -->
        <!-- <pre
          >{{ websiteTags }}
        </pre> -->
        <!-- <pre
          >{{ selectedWebsiteTags }}
        </pre> -->
      </div>

      <div class="mb-4" v-if="task?.requirement">
        <label class="block text-gray-700 font-medium mb-2">Requirement</label>
        <div>
          <p>{{ task?.requirement?.title }}</p>
        </div>
      </div>

      <!--
      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium">
          From Department <RequiredIcon />
        </label>

        <select
          v-model="form.from_department_id"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="">--select department--</option>
          <optgroup
            v-for="company in companyStore.companies"
            :key="company.id"
            :label="company.name"
          >
            <option
              v-for="department in company.departments"
              :value="department.id"
              :key="department.id"
            >
              {{ department.name }}
            </option>
          </optgroup>
        </select>
      </div>

      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium">
          To Department <RequiredIcon />
        </label>
        <select
          v-model="form.to_department_id"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="">--select department--</option>
          <optgroup
            v-for="company in companyStore.companies"
            :key="company.id"
            :label="company.name"
          >
            <option
              v-for="department in company.departments"
              :value="department.id"
              :key="department.id"
            >
              {{ department.name }}
            </option>
          </optgroup>
        </select>
      </div>
      -->

      <div class="mb-4">
        <label class="block text-gray-700 font-medium mb-2">Description</label>
        <div v-if="loading"></div>
        <TextEditor v-model="form.description" v-else />
      </div>

      <div class="sticky bottom-0 bg-white py-4 border-t">
        <div v-if="store.error || errorMessage" class="mb-4 text-red-500 font-medium">
          {{ store.error || errorMessage }}
        </div>
        <hr v-if="store.error" />
        <div class="flex items-center gap-4 justify-between">
          <button type="button" @click.prevent="emit('close')" class="btn-3">Cancel</button>

          <button :disabled="loading" type="submit" class="btn-2">
            {{ loading ? 'Updating...' : 'Update Task' }}
          </button>
        </div>
      </div>
    </form>
    <SectionLoading v-if="loading" />
  </div>
</template>
