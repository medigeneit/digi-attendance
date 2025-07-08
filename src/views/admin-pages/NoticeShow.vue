<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useNoticeStore } from '@/stores/notice'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()

const noticeStore = useNoticeStore()
const toast = useToast()
const route = useRoute()

const notice = ref(null)
const isLoading = ref(true)
const error = ref(null)

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const fetchNotice = async () => {
  try {
    isLoading.value = true
    error.value = null
    const noticeId = route.params.id
    notice.value = await noticeStore.fetchNotice(noticeId)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load notice details'
    toast.error(error.value)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchNotice()
})

const downloadFile = async (fileUrl) => {
  window.open(fileUrl, '_blank') // Opens file in a new tab
}

const isImage = (file) => {
  if (!file) return false;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
};

const isPDF = (file) => {
  if (!file) return false;
  return /\.pdf$/i.test(file);
};

const getFilename = (file) => {
  return file?.split('/').pop();
};
</script>

<template>
  <div class="my-container space-y-6">
    <div class="card-bg p-6">
      <h2 class="title-lg text-center">Notice Details</h2>
      <LoaderView v-if="isLoading" class="shadow-none" />
      <div v-else-if="error" class="text-center text-red-500">
        <p>{{ error }}</p>
      </div>
      <div v-else class="grid gap-2">
        <div class="bg-gray-100 p-4 rounded-lg">
          <p class="title-md">Notice Info</p>
          <hr class="mb-2" />
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="font-bold text-gray-600">Title:</p>
              <p class="text-sm text-gray-800">{{ notice?.title }}</p>
            </div>

            <div v-if="authStore?.user?.role === 'super_admin' ||  authStore?.user?.role === 'developer' || authStore?.user?.id === notice?.created_id" >
              <p class="font-bold text-gray-600">Company:</p>
              <p
                class="text-gray-800 text-sm"
                v-if="Array.isArray(notice?.companies_notice) && notice?.companies_notice?.length"
              >
                <span v-for="(company, index) in notice?.companies_notice" :key="company.id">
                  {{ company?.name }}
                  {{ index < notice?.companies_notice.length - 1 ? ', ' : '' }}
                </span>
              </p>
              <p v-else class="text-lg text-gray-800">All department</p>
            </div>

            <div v-if="authStore?.user?.role === 'super_admin' ||  authStore?.user?.role === 'developer' || authStore?.user?.id === notice?.created_id">
              <p class="font-bold text-gray-600">Department:</p>
              <p
                class="text-gray-800"
                v-if="Array.isArray(notice?.departments) && notice?.departments?.length"
              >
                <span v-for="(department, index) in notice?.departments" :key="department.id">
                  {{ department?.name }}
                  {{ index < notice?.departments.length - 1 ? ', ' : '' }}
                </span>
              </p>
              <p v-else class="text-gray-800">All department</p>
            </div>

            <div v-if="authStore?.user?.role === 'super_admin' ||  authStore?.user?.role === 'developer' || authStore?.user?.id === notice?.created_id">
              <p class="font-bold text-gray-600">Employee:</p>
              <p
                v-if="Array.isArray(notice?.employees) && !notice?.employees?.length"
                class="text-gray-800"
              >
                All employees
              </p>
              <p v-else>Multiple employees</p>
            </div>

            <div>
              <p class="font-bold text-gray-600">Published Date:</p>
              <p class="text-gray-800">{{ formatDate(notice?.published_at) }}</p>
            </div>

            <div>
              <p class="font-bold text-gray-600">Expired Date:</p>
              <p class="text-gray-800">{{ formatDate(notice?.expired_at) }}</p>
            </div>

            <!-- <div>
              <p class="text-sm font-bold text-gray-600 mb-2">File:</p>
              <button v-if="notice?.file" @click="downloadFile(notice?.file)" class="btn-2">
                Download File
              </button>
            </div> -->

            <div class="col-span-full">
              <p class="font-bold text-gray-600">Description / Body:</p>
              <p class="text-gray-800" v-html="notice?.description"></p>
            </div>

            <div class="col-span-full" v-if="notice?.file">
              <div class="flex items-center gap-2">
                 <!-- যদি ইমেজ হয় -->
                <img
                  v-if="isImage(notice?.file)"
                  :src="notice?.file"
                  alt="Notice File"
                  class="object-cover rounded-md cursor-pointer"
                  style="width: 80%;"
                  @click="downloadFile(notice?.file)"
                />

                <!-- যদি PDF হয় -->
                <iframe
                  v-else-if="isPDF(notice?.file)"
                  :src="notice?.file"
                  class="w-full md:h-[700px] border rounded-md"
                ></iframe>

                <!-- অন্য ফাইল -->
                <span v-else class="text-blue-500 cursor-pointer" @click="downloadFile(notice?.file)">
                  File: {{ getFilename(notice?.file) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <ShareComponent />
        <div class="flex justify-center mt-2 gap-4">
          <RouterLink
            :to="{ name: 'NoticeList' }"
            type="button"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to List
          </RouterLink>
          <RouterLink
            :to="{ name: 'NoticeEdit', params: { id: notice?.id } }"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Edit
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
