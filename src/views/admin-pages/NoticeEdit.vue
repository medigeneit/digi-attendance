<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import TextEditor from '@/components/TextEditor.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Multiselect from 'vue-multiselect'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
const form = reactive({
  title: '',
  type: '',
  description: '',
  published_at: '',
  expired_at: '',
  company_id: 'all',
  department_id: '',
  file: '',
})

const noticeStore = useNoticeStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const isLoading = ref(false)
const { companies } = storeToRefs(companyStore)
const { employees } = storeToRefs(departmentStore)

const selectedDepartments = ref([])

const department_ids = computed(() => selectedDepartments.value.map((dep) => dep.id))

const selectedEmployees = ref([])

const employee_ids = computed(() => selectedEmployees.value.map((dep) => dep.id))

onMounted(async () => {
  isLoading.value = true
  await companyStore.fetchCompanies()
  await loadNotice()
  isLoading.value = false
})

watch(
  () => form.company_id,
  async (newCompanyId) => {
    if (newCompanyId) {
      await departmentStore.fetchDepartments(newCompanyId)
      isLoading.value = false
    }
  },
)

const fileUploadLink = async (event) => {
  const file = event.target.files[0]

  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await noticeStore.fetchFileUpload(formData)
    console.log({ response: response?.url })
    form.file = response?.url
  }
}

const updateFormattedDate = (date) => {
  if (!date) {
    return
  }
  const datePart = date.split(' ')[0]

  if (!datePart.includes('-')) {
    formattedDate.value = 'Invalid Date Format'
    return
  }
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
    selectedDepartments.value = notice.departments
    selectedEmployees.value = notice.employees
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
      department_ids: department_ids.value,
      employee_ids: employee_ids.value,
    }
    console.log({ dataToSend })

    await noticeStore.updateNotice(route.params.id, dataToSend)
    toast.success('Notice updated successfully')
    router.push({ name: 'NoticeShow', params: { id: route.params.id } })
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update notice'
    toast.error(errorMessage)
  }
}
watch(selectedDepartments, (newSelection) => {
  const newDepartmentIds = newSelection.map((dep) => dep.id)
  departmentStore.fetchDepartmentEmployee(newDepartmentIds)
})
</script>

<template>
  <div class="my-container space-y-2">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Edit Notice</h2>
      <LoaderView v-if="isLoading" class="bg-gray-100 border shadow-none" />
      <form v-else @submit.prevent="updateNotice" class="space-y-4">
        <div class="grid gap-4">
          <div class="border p-4 rounded-md bg-gray-100">
            <p class="title-md">Notice Info</p>
            <hr class="my-2" />
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label>Company</label>
                <select
                  id="company_id"
                  v-model="form.company_id"
                  class="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="all">All Company</option>
                  <template v-for="company in companyStore.companies" :key="company?.id">
                    <option :value="company?.id">
                      {{ company?.name }}
                    </option>
                  </template>
                </select>
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

              <div v-if="form.type !== '2'">
                <label>Publish Date</label>
                <input v-model="form.published_at" type="date" class="w-full p-2 border rounded" />
              </div>

              <div v-if="form.type !== '2'">
                <label>Expire Date</label>
                <input v-model="form.expired_at" type="date" class="w-full p-2 border rounded" />
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

              <div>
                <label>Title*</label>
                <input v-model="form.title" type="text" class="w-full p-2 border rounded" />
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
<style>
@import 'vue-multiselect/dist/vue-multiselect.css';
</style>
