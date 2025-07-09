<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import TextEditor from '@/components/TextEditor.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const isLoading = ref(false)

const noticeStore = useNoticeStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { employees } = storeToRefs(departmentStore)

const form = reactive({
  title: '',
  type: '',
  description: '',
  published_at: '',
  expired_at: '',
  company_id: 'all',
  department_id: '',
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

watch(selectedCompanies, (newList) => {
  form.all_companies = newList.length === companyStore.companies.length
})

watch(selectedDepartments, (newList) => {
  form.all_departments = newList.length === departmentStore.departments.length
})

watch(() => form.all_companies, async (allCompany) => {
  if (allCompany) {
    await departmentStore.fetchDepartments()
  }
})

watch(() => form.all_departments, async (allDepartment) => {
  if (allDepartment) {
    await departmentStore.fetchDepartmentEmployee('all')
  }
})

watch(company_ids, async (newCompanyIds) => {
  if (newCompanyIds.length) {
    await departmentStore.fetchDepartments(newCompanyIds)
  }
})

watch(department_ids, async (newDepartmentIds) => {
  if (newDepartmentIds.length) {
    await departmentStore.fetchDepartmentEmployee(newDepartmentIds)
  }
})

const fileUploadLink = async (event) => {
  const file = event.target.files[0]
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await noticeStore.fetchFileUpload(formData)
    form.file = response?.url
  }
}

const updateFormattedDate = (date) => {
  if (!date) return
  const datePart = date.split(' ')[0]
  if (!datePart.includes('-')) return 'Invalid Date Format'
  return datePart
}

const loadNotice = async () => {
  try {
    const noticeId = route.params.id
    const notice = await noticeStore.fetchNotice(noticeId)
    form.title = notice.title
    form.type = notice.type
    form.file = notice.file
    form.published_at = updateFormattedDate(notice.published_at)
    form.expired_at = updateFormattedDate(notice.expired_at)
    form.description = notice.description
    form.company_id = notice.company_id ?? 'all'
    form.department_id = notice.department_id
    selectedCompanies.value = notice.companies_notice
    selectedDepartments.value = notice.departments
    selectedEmployees.value = notice.employees

    form.all_companies = notice.companies_notice.length === 0
    form.all_departments = notice.departments.length === 0
    form.all_employees = notice.employees.length === 0
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to load notice data'
    toast.error(errorMessage)
    router.push({ name: 'NoticeList' })
  }
}

const updateNotice = async () => {
  try {
    const dataToSend = {
      ...form,
      company_ids: company_ids.value,
      department_ids: department_ids.value,
      employee_ids: employee_ids.value,
    }
    await noticeStore.updateNotice(route.params.id, dataToSend)
    toast.success('Notice updated successfully')
    router.push({ name: 'NoticeShow', params: { id: route.params.id } })
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update notice'
    toast.error(errorMessage)
  }
}

onMounted(async () => {
  isLoading.value = true
  await companyStore.fetchCompanies()
  await loadNotice()
  isLoading.value = false
})
</script>


<template>
  <div class="my-container space-y-2">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Edit Notice</h2>
      <LoaderView v-if="isLoading" class="bg-gray-100 border shadow-none" />
      <form v-else @submit.prevent="updateNotice" class="space-y-4">
        <div class="grid gap-4">
          <div class="space-y-6 ">
            <div class="border p-4 rounded-md bg-white space-y-6">
              <h2 class="text-lg">Notice Information</h2>
              <div class="space-y-3">
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

              <div class="flex justify-between md:flex-row flex-col items-center gap-4">
                <div class="w-full">
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
  
                <div class="w-full" v-if="form.type !== '2'">
                  <label>Publish Date</label>
                  <input v-model="form.published_at" type="date" class="w-full p-2 border rounded" />
                </div>
  
                <div class="w-full" v-if="form.type !== '2'">
                  <label>Expire Date</label>
                  <input v-model="form.expired_at" type="date" class="w-full p-2 border rounded" />
                </div>
              </div>


              <div class="col-span-3 flex justify-between gap-8">
                <div class="w-full space-y-3">
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
                <div class="w-full space-y-3">
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
                    :options="employees"
                    :multiple="true"
                    :searchable="true"
                    placeholder="Select Employee"
                    track-by="id"
                    label="name"
                    :disabled="form.all_employees"
                  />
                </div>
              </div>
            </div>

            <div class="border p-4 rounded-md bg-white space-y-6">
                <h2 class="text-lg">Notice Content</h2>
                <div>
                  <label>Title*</label>
                  <input v-model="form.title" type="text" class="w-full p-2 border rounded" />
                </div>
  
                <div>
                  <label>File</label>
                  <!-- Show existing file link if available -->
                  <div v-if="form.file && typeof form.file === 'string'" class="mb-2">
                    <a :href="form.file" target="_blank" class="text-blue-500 underline">
                      View Current File
                    </a>
                  </div>
                  <!-- File Input -->
                  <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />
  
                  <!-- Show Selected File Name -->
                  <!-- <p v-if="fileName" class="text-sm text-gray-600 mt-1">
                    Selected File: {{ fileName }}
                  </p> -->
                </div>
  
                <div class="col-span-full">
                  <label>Description</label>
                  <TextEditor
                    v-model="form.description"
                    cols="30"
                    rows="10"
                    class="w-full px-4 py-2"
                  ></TextEditor>
                </div>
            </div>

          </div>
        </div>

        <div class="flex justify-center gap-4">
          <RouterLink
            :to="{ name: 'NoticeList' }"
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