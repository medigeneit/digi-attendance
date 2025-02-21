<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useNoticeStore } from '@/stores/notice'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

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
              <p class="text-sm font-bold text-gray-600">Company:</p>
              <p class="text-lg text-gray-800">{{ notice?.company?.name || 'N/A' }}</p>
            </div>

            <div>
              <p class="text-sm font-bold text-gray-600">Department:</p>
              <p class="text-lg text-gray-800">
                <span v-for="(department, index) in notice?.departments" :key="department.id">
                  {{ department?.name }}
                  {{ index < notice?.departments.length - 1 ? ', ' : '' }}
                </span>
              </p>
            </div>

            <div>
              <p class="text-sm font-bold text-gray-600">Published Date:</p>
              <p class="text-lg text-gray-800">{{ formatDate(notice?.published_at) }}</p>
            </div>

            <div>
              <p class="text-sm font-bold text-gray-600">Expired Date:</p>
              <p class="text-lg text-gray-800">{{ formatDate(notice?.expired_at) }}</p>
            </div>

            <div>
              <p class="text-sm font-bold text-gray-600 mb-2">File:</p>
              <button @click="downloadFile(notice?.file)" class="btn-2">Download File</button>
            </div>

            <div class="col-span-full">
              <p class="text-sm font-bold text-gray-600">Description / Body:</p>
              <p class="text-lg text-gray-800" v-html="notice?.description"></p>
            </div>
          </div>
        </div>
        <div class="flex justify-center mt-8 gap-4">
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
