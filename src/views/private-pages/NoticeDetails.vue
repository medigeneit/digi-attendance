<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useNoticeStore } from '@/stores/notice'
import Swal from 'sweetalert2'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

const noticeStore = useNoticeStore()
const toast = useToast()
const route = useRoute()

const feedback = ref('')

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
    notice.value = await noticeStore.fetchNoticeDetails(noticeId)
    feedback.value = notice.value.user_feedback?.feedback
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load notice details'
    toast.error(error.value)
  } finally {
    isLoading.value = false
  }
}
const createNoticeFeedback = async () => {
  if (feedback.value) {
    try {
      const noticeId = route.params.id

      const userFeedback = {
        feedback: feedback.value,
      }

      await noticeStore.createNoticeFeedback(noticeId, userFeedback)

      Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Your feedback has been saved',
        showConfirmButton: false,
        timer: 1500,
      })
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to load notice details'
      toast.error(error.value)
    } finally {
      isLoading.value = false
    }
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
              <p class="text-sm font-bold text-gray-600">File:</p>
              <button v-if="notice?.file" @click="downloadFile(notice?.file)" class="btn-2">
                Download File
              </button>
            </div>

            <div class="col-span-full">
              <p class="text-sm font-bold text-gray-600">Description / Body:</p>
              <p class="text-lg text-gray-800" v-html="notice?.description"></p>
            </div>
          </div>
        </div>
        <div class="md:flex justify-center mt-8 gap-4" v-if="!notice?.user_feedback">
          <div class="w-1/2">
            <input
              v-model="feedback"
              type="text"
              class="input-1"
              placeholder="Please enter your feedback"
            />
          </div>
          <div
            @click="createNoticeFeedback"
            :class="{ 'btn-2': notice?.user_feedback, 'btn-3': !notice?.user_feedback }"
          >
            {{ notice?.user_feedback ? 'Notice Feedback Updated' : 'Submit Notice Feedback' }}
          </div>
        </div>
        <div v-else class="colored-bg-light text-center">
          My Feedback:
          {{ notice?.user_feedback?.feedback }}
        </div>
      </div>
      <ShareComponent />
    </div>
  </div>
</template>
