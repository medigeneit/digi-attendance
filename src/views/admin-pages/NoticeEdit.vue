<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useNoticeStore } from '@/stores/notice'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import TextEditor from '@/components/TextEditor.vue'
const form = reactive({
  title: '',
  description: '',
  published_at: '',
  expired_at: '',
  company_id: '',
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
    form.file = notice.file
    form.published_at = updateFormattedDate(notice.published_at)
    form.expired_at = updateFormattedDate(notice.expired_at)
    form.description = notice.description
    form.company_id = notice.company_id
    form.department_id = notice.department_id
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to load notice data'
    toast.error(errorMessage)
    router.push({ name: 'NoticeList' })
  }
}

const updateNotice = async () => {
  try {
    const dataToSend = { ...form }
    await noticeStore.updateNotice(route.params.id, dataToSend)
    toast.success('Notice updated successfully')
    router.push({ name: 'NoticeShow', params: { id: route.params.id } })
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update notice'
    toast.error(errorMessage)
  }
}
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
                  <option value="" disabled>Select a company</option>
                  <template v-for="company in companyStore.companies" :key="company?.id">
                    <option :value="company?.id">
                      {{ company?.name }}
                    </option>
                  </template>
                </select>
              </div>

              <div>
                <label>Department</label>
                <select v-model="form.department_id" class="w-full p-2 border rounded">
                  <option value="" disabled>Select a department</option>
                  <option
                    v-for="department in departmentStore.departments"
                    :key="department?.id"
                    :value="department?.id"
                  >
                    {{ department?.name }}
                  </option>
                </select>
              </div>
              <div>
                <label>Publish Date</label>
                <input v-model="form.published_at" type="date" class="w-full p-2 border rounded" />
              </div>

              <div>
                <label>Expire Date</label>
                <input v-model="form.expired_at" type="date" class="w-full p-2 border rounded" />
              </div>
              <div>
                <label>Title*</label>
                <input v-model="form.title" type="text" class="w-full p-2 border rounded" />
              </div>

              <div>
                <label>File</label>
                <input type="file" class="w-full p-2 border rounded" />
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
