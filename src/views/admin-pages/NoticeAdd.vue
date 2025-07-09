<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import TextEditor from '@/components/TextEditor.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const noticeStore = useNoticeStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)

const form = reactive({
  title: '',
  type: 1,
  description: '',
  published_at: '',
  expired_at: '',
  company_id: '',
  file: '',
  all_companies: false,
  all_departments: false,
  all_employees: false,
})

const selectedCompanies = ref([])
const selectedDepartments = ref([])
const selectedEmployees = ref([])

const company_ids = computed(() => selectedCompanies.value.map((comp) => comp.id))
const department_ids = computed(() => selectedDepartments.value.map((dep) => dep.id))
const employee_ids = computed(() => selectedEmployees.value.map((emp) => emp.id))

const toggleAllCompany = () => {
  selectedCompanies.value = form.all_companies
    ? [...companyStore.companies]
    : []
}

const toggleAllDepartments = () => {
  selectedDepartments.value = form.all_departments
    ? [...departmentStore.departments]
    : []
}

const toggleAllEmployees = () => {
  if (form.all_employees) {
    employee_ids.value = []
  }
}

onMounted(async () => {
  await companyStore.fetchCompanies()
})

// Watch if "Select All Companies" changes
watch(() => form.all_companies, async (allCompany) => {
  if (allCompany) {
    await departmentStore.fetchDepartments()
  }
})

// Watch if "Select All Departments" changes
watch(() => form.all_departments, async (allDepartment) => {
  if (allDepartment) {
    await departmentStore.fetchDepartmentEmployee('all')
  }
})

// Watch selected company change → fetch departments
watch(company_ids, async (newCompanyIds) => {
  await departmentStore.fetchDepartments(newCompanyIds)
})

// Watch selected department change → fetch employees
watch(department_ids, async (newDepartmentIds) => {
  await departmentStore.fetchDepartmentEmployee(newDepartmentIds)
})

// Auto uncheck "Select All" if any company is removed
watch(selectedCompanies, (newList) => {
  form.all_companies = newList.length === companyStore.companies.length
})

// Auto uncheck "Select All" if any department is removed
watch(selectedDepartments, (newList) => {
  form.all_departments = newList.length === departmentStore.departments.length
})

const fileUploadLink = async (event) => {
  const file = event.target.files[0]
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await noticeStore.fetchFileUpload(formData)
    form.file = response?.data?.url
  }
}

const saveNotice = async () => {
  try {
    const dataToSend = {
      title: form.title,
      type: form.type,
      description: form.description,
      published_at: form.published_at,
      expired_at: form.expired_at,
      company_id: form.company_id,
      company_ids: company_ids.value,
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
    const errorMessage = error.response?.data?.message || 'Failed to save notice'
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
            <div class="grid md:grid-cols-2 gap-4">
              <div class="w-full">
                <label>
                  <input type="checkbox" v-model="form.all_companies" @change="toggleAllCompany" />
                  Select All Companies
                </label>
                <MultiselectDropdown
                  v-model="selectedCompanies"
                  :options="companies"
                  :multiple="true"
                  :searchable="true"
                  placeholder="Select companies"
                  track-by="id"
                  label="name"
                  :disabled="form.all_companies"
                />
              </div>

              <div>
                <label>Type*</label>
                <select
                  id="type"
                  v-model="form.type"
                  class="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="1">General</option>
                  <option value="2">Policy</option>
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
              <div class="col-span-2 flex justify-between gap-8">
                <div class="w-full">
                  <label>
                    <input
                      type="checkbox"
                      v-model="form.all_departments"
                      @change="toggleAllDepartments"
                    />
                    Select All Departments
                  </label>
                  <MultiselectDropdown
                    v-model="selectedDepartments"
                    :options="departmentStore.departments"
                    :multiple="true"
                    :searchable="true"
                    placeholder="Select departments"
                    track-by="id"
                    label="name"
                    :disabled="form.all_departments"
                  />
                </div>
                <div class="w-full">
                  <label>
                    <input
                      type="checkbox"
                      v-model="form.all_employees"
                      @change="toggleAllEmployees"
                    />
                    Select All Employees
                  </label>
                  <MultiselectDropdown
                    v-model="selectedEmployees"
                    :options="departmentStore.employees"
                    :multiple="true"
                    :searchable="true"
                    track-by="id"
                    label="name"
                    placeholder="Select Employees"
                    :disabled="form.all_employees"
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
