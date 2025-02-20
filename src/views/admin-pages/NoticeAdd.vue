<script setup>
import TextEditor from '@/components/TextEditor.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Multiselect from 'vue-multiselect'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const noticeStore = useNoticeStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { employees } = storeToRefs(departmentStore)

const form = reactive({
  title: '',
  description: '',
  published_at: '',
  expired_at: '',
  company_id: '',
  department_id: '',
  department_ids: [],
  file: '',
})

const selectedDepartments = ref([])

const department_ids = computed(() => selectedDepartments.value.map((dep) => dep.id))

const selectedEmployees = ref([])

const employee_ids = computed(() => selectedEmployees.value.map((dep) => dep.id))

onMounted(async () => {
  await companyStore.fetchCompanies()
})

watch(
  () => form.company_id,
  async (newCompanyId) => {
    if (newCompanyId) {
      await departmentStore.fetchDepartments(newCompanyId)
      form.department_id = ''
    }
  },
)

watch(selectedDepartments, (newSelection) => {
  const newDepartmentIds = newSelection.map((dep) => dep.id)
  departmentStore.fetchDepartmentEmployee(newDepartmentIds)
})

const fileUploadLink = async (event) => {
  const file = event.target.files[0]

  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    console.log({ file })
    const response = await noticeStore.fetchFileUpload(formData)
    form.file = response?.data?.url
  }
}

const saveNotice = async () => {
  try {
    const dataToSend = {
      title: form.title,
      description: form.description,
      published_at: form.published_at,
      expired_at: form.expired_at,
      company_id: form.company_id,
      department_id: form.department_id,
      department_ids: department_ids.value,
      employee_ids: employee_ids.value,
      file: form.file,
    }

    await noticeStore.createNotice(dataToSend)
    toast.success('Notice created successfully')
    await noticeStore.fetchNotices()
    router.replace('/hrd/notice')
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to save user'
    toast.error(errorMessage)
    console.error(errorMessage)
  }
}
</script>

<template>
  <div class="my-container space-y-2">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Add Notice</h2>
      <form @submit.prevent="saveNotice" class="space-y-4">
        <div class="grid gap-4">
          <div class="border p-4 rounded-md bg-gray-100">
            <p class="title-md">Notice Info</p>
            <hr class="my-2" />
            <div class="grid md:grid-cols-3 gap-4">
              <div>
                <label>Company *</label>
                <select
                  id="company_id"
                  v-model="form.company_id"
                  class="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="" disabled>Select a company</option>
                  <template v-for="company in companies" :key="company?.id">
                    <option :value="company?.id">
                      {{ company?.name }}
                    </option>
                  </template>
                </select>
              </div>
              <div>
                <label>Publish Date*</label>
                <input
                  v-model="form.published_at"
                  type="date"
                  class="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label>Expired Date*</label>
                <input
                  v-model="form.expired_at"
                  type="date"
                  class="w-full p-2 border rounded"
                  required
                />
              </div>
              <div class="col-span-3 flex justify-between gap-8">
                <div class="w-full">
                  <label>Departments</label>
                  <Multiselect
                    v-model="selectedDepartments"
                    :options="departmentStore.departments"
                    :multiple="true"
                    :searchable="true"
                    placeholder="Select departments"
                    track-by="id"
                    label="name"
                    class="w-full p-2 border rounded"
                  />
                </div>
                <div class="w-full">
                  <label>Employees</label>
                  <Multiselect
                    v-model="selectedEmployees"
                    :options="employees"
                    :multiple="true"
                    :searchable="true"
                    placeholder="Select Employee"
                    track-by="id"
                    label="name"
                    class="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div class="col-span-full">
                <label>Title*</label>
                <input
                  v-model="form.title"
                  type="text"
                  class="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label>File</label>
                <input @change="fileUploadLink" type="file" class="w-full p-2 border rounded" />
              </div>

              <div class="col-span-full">
                <label>Description</label>
                <TextEditor
                  v-model="form.description"
                  cols="30"
                  rows="10"
                  class="w-full"
                ></TextEditor>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-4">
          <RouterLink
            :to="{ name: 'UserList' }"
            type="button"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </RouterLink>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
<style>
@import 'vue-multiselect/dist/vue-multiselect.css';
</style>
