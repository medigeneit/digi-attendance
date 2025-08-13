<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useNoticeStore } from '@/stores/notice'
import Swal from 'sweetalert2'
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useHead } from '@vueuse/head'
import noitceImage from '@/assets/notice.png'

const noticeStore = useNoticeStore()
const toast = useToast()
const route = useRoute()

const notice = ref(null)
const isLoading = ref(true)
const error = ref(null)

const editing = ref(false)
const feedback = ref('')
const maxChars = 300

// ---------- Utils ----------
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const isImage = (file) => !!file && /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
const isPDF   = (file) => !!file && /\.pdf$/i.test(file)
const getFilename = (file) => file?.split('/').pop() || 'file'

const hasFeedback = computed(() => !!notice.value?.user_feedback)
const remainingChars = computed(() => maxChars - (feedback.value?.length || 0))
const disabledSubmit = computed(() => {
  const t = (feedback.value || '').trim()
  return isLoading.value || t.length === 0 || t.length > maxChars
})

// ---------- Data Fetch ----------
const fetchNotice = async () => {
  try {
    isLoading.value = true
    error.value = null
    const noticeId = route.params.id
    const data = await noticeStore.fetchNoticeDetails(noticeId)
    notice.value = data
    feedback.value = data?.user_feedback?.feedback || ''
    editing.value = !data?.user_feedback // ফিডব্যাক না থাকলে সরাসরি এডিটিং অন
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to load notice details'
    toast.error(error.value)
  } finally {
    isLoading.value = false
  }
}

// ---------- Create/Update Feedback ----------
const saveFeedback = async () => {
  const text = (feedback.value || '').trim()
  if (!text) {
    toast.error('Please enter your feedback')
    return
  }
  if (text.length > maxChars) {
    toast.error(`Feedback must be within ${maxChars} characters`)
    return
  }

  isLoading.value = true
  try {
    const noticeId = route.params.id
    const payload = { feedback: text }
    const res = await noticeStore.createNoticeFeedback(noticeId, payload)

    // লোকাল স্টেট আপডেট (immediate UI update)
    const serverFeedback = res?.data?.user_feedback || res?.user_feedback || payload
    notice.value = { ...notice.value, user_feedback: serverFeedback }

    await Swal.fire({
      position: 'top-end',
      icon: 'success',
      title: 'Your feedback has been saved',
      showConfirmButton: false,
      timer: 1300
    })

    editing.value = false
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to save feedback'
    toast.error(error.value)
  } finally {
    isLoading.value = false
  }
}

// ---------- Head Meta (reactive) ----------
watch(
  () => notice.value,
  (n) => {
    useHead({
      title: n?.title || 'Genesis - Notice',
      meta: [
        { property: 'og:title', content: n?.title || 'Genesis - Notice' },
        { property: 'og:image', content: n?.file || noitceImage },
        { property: 'og:description', content: n?.description || 'Genesis - Notice Description' }
      ]
    })
  },
  { immediate: true }
)

const downloadFile = (fileUrl) => {
  if (!fileUrl) return
  window.open(fileUrl, '_blank')
}

onMounted(fetchNotice)
</script>

<template>
  <div class="my-container py-6">
    <div class="mx-auto max-w-5xl">
      <!-- Header Card -->
      <div class="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-4 border-b">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <i class="far fa-bell text-indigo-600"></i>
            </div>
            <div>
              <h1 class="text-xl md:text-2xl font-semibold text-gray-900">Notice Details</h1>
              <p class="text-sm text-gray-500">Review the notice and leave your feedback</p>
            </div>
          </div>

          <!-- Status Badge -->
          <div class="flex items-center gap-2">
            <span
              v-if="!notice?.user_feedback"
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border-amber-200"
              title="No feedback yet"
            >
              <span class="h-2 w-2 rounded-full bg-amber-500"></span>
              Pending Feedback
            </span>
            <span
              v-else
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border-emerald-200"
              title="Feedback submitted"
            >
              <i class="far fa-check"></i>
              Feedback Submitted
            </span>
          </div>
        </div>

        <!-- Body -->
        <div class="px-5 py-5">
          <!-- Loading / Error -->
          <LoaderView v-if="isLoading" class="shadow-none" />
          <div v-else-if="error" class="rounded-lg bg-red-50 text-red-700 px-4 py-3">
            {{ error }}
          </div>

          <div v-else class="grid gap-6">
            <!-- Title & Description -->
            <div class="rounded-xl border p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-xs uppercase tracking-wider font-medium text-gray-500 mb-1">Title</div>
                  <h2 class="text-lg md:text-xl font-semibold text-gray-900" v-html="notice?.title"></h2>
                </div>

                <!-- Small dot / check visual -->
                <div class="shrink-0 mt-1">
                  <span
                    v-if="!notice?.user_feedback"
                    class="h-3 w-3 bg-red-500 rounded-full inline-block"
                    title="No feedback yet"
                  ></span>
                  <span v-else class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-50" title="Feedback submitted">
                    <i class="far fa-check text-emerald-600"></i>
                  </span>
                </div>
              </div>

              <div v-if="notice?.description" class="mt-4">
                <div class="text-xs uppercase tracking-wider font-medium text-gray-500 mb-1">Description</div>
                <div class="prose max-w-none text-gray-800" v-html="notice?.description"></div>
              </div>

              <div class="mt-5 grid sm:grid-cols-2 gap-4" v-if="notice?.published_at || notice?.expired_at">
                <div class="rounded-lg bg-gray-50 p-3">
                  <div class="text-xs text-gray-500">Published</div>
                  <div class="text-sm font-medium text-gray-800">{{ formatDate(notice?.published_at) }}</div>
                </div>
                <div class="rounded-lg bg-gray-50 p-3">
                  <div class="text-xs text-gray-500">Expires</div>
                  <div class="text-sm font-medium text-gray-800">{{ formatDate(notice?.expired_at) }}</div>
                </div>
              </div>
            </div>

            <!-- File Preview -->
            <div v-if="notice?.file" class="rounded-xl border p-5">
              <div class="flex items-center justify-between">
                <div class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <i class="far fa-file"></i>
                  Attachment
                </div>
                <button
                  class="text-sm underline text-indigo-600 hover:text-indigo-700"
                  @click="downloadFile(notice?.file)"
                >
                  Download ({{ getFilename(notice?.file) }})
                </button>
              </div>

              <div class="mt-3">
                <!-- Image -->
                <div v-if="isImage(notice?.file)" class="relative rounded-lg overflow-hidden border">
                  <img
                    :src="notice?.file"
                    alt="Notice File"
                    class="w-full max-h-[480px] object-contain bg-gray-50"
                  />
                </div>

                <!-- PDF -->
                <div v-else-if="isPDF(notice?.file)" class="rounded-lg overflow-hidden border">
                  <iframe
                    :src="notice?.file"
                    class="w-full h-[700px] bg-white"
                  ></iframe>
                </div>

                <!-- Other -->
                <div v-else class="rounded-lg bg-gray-50 p-4 border flex items-center justify-between">
                  <div class="text-gray-700">
                    <span class="font-medium">File:</span> {{ getFilename(notice?.file) }}
                  </div>
                  <button
                    class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                    @click="downloadFile(notice?.file)"
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>

            <!-- Feedback Section -->
            <div class="rounded-2xl border p-5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <i class="far fa-comment-dots text-emerald-600"></i>
                  </div>
                  <h3 class="text-base md:text-lg font-semibold text-gray-900">Your Feedback</h3>
                </div>

                <!-- Toggle Edit button (only if already submitted) -->
                <button
                  v-if="hasFeedback"
                  @click="editing = !editing"
                  class="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                >
                  {{ editing ? 'Cancel' : 'Edit Feedback' }}
                </button>
              </div>

              <!-- If not submitted OR editing -->
              <div v-if="!hasFeedback || editing" class="mt-4 space-y-3">
                <div>
                  <textarea
                    v-model="feedback"
                    :maxlength="maxChars + 1"
                    rows="3"
                    class="w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    placeholder="Type your feedback here..."
                    @keyup.enter.ctrl="saveFeedback"
                  ></textarea>
                  <div class="mt-1 flex items-center justify-between text-xs">
                    <span class="text-gray-500">Press <kbd class="px-1 border rounded">Ctrl</kbd> + <kbd class="px-1 border rounded">Enter</kbd> to submit</span>
                    <span :class="remainingChars < 0 ? 'text-red-600' : 'text-gray-500'">{{ remainingChars }} characters left</span>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <button
                    @click="saveFeedback"
                    :disabled="disabledSubmit"
                    class="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {{ isLoading ? 'Saving...' : (hasFeedback ? 'Update Feedback' : 'Submit Feedback') }}
                  </button>
                  <span v-if="hasFeedback && !editing" class="text-sm text-gray-500">You can edit your feedback anytime.</span>
                </div>
              </div>

              <!-- If submitted & not editing -->
              <div v-else class="mt-4">
                <div class="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">
                  <div class="flex items-start gap-3">
                    <i class="far fa-check-circle mt-0.5"></i>
                    <div>
                      <div class="text-sm font-semibold">Your feedback</div>
                      <div class="text-sm mt-0.5">{{ notice?.user_feedback?.feedback }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Share -->
            <div class="rounded-2xl border p-5">
              <ShareComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose :where(img):not(:where([class~="not-prose"] *)) {
  margin: 0;
}
</style>
