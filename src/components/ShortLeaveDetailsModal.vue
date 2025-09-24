<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ScreenshotCapture from '@/components/common/ScreenshotCapture.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useShortLeaveStore } from '@/stores/short-leave'
import { computed, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'

/* ---------- props & emits ---------- */
const props = defineProps({
  open: { type: Boolean, default: false },
  id: { type: [String, Number], required: true }, // short leave id
})
const emit = defineEmits(['update:open'])

/* ---------- stores & state ---------- */
const toast = useToast()
const shortLeaveStore = useShortLeaveStore()
const authStore = useAuthStore()

const attachment = ref(null)
const loading = ref(false)
const shortLeave = computed(() => shortLeaveStore.shortLeave)

/* ---------- helpers ---------- */
const close = () => emit('update:open', false)

const load = async () => {
  if (!props.id) return
  loading.value = true
  try {
    await shortLeaveStore.fetchShortLeaveById(props.id)
  } catch (err) {
    console.error('Failed to fetch short leave details:', err)
    toast.error('Failed to load short leave details.')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.id],
  ([open]) => {
    if (open) load()
  },
  { immediate: true }
)

const uploadShortLeaveAttachment = async () => {
  try {
    const payload = { attachment: attachment.value }
    await shortLeaveStore.uploadShortLeaveAttachment(props.id, payload)
    toast.success('Attachment saved!')
    await load()
  } catch (err) {
    console.error('Failed to upload attachment:', err)
    toast.error('Failed to upload attachment.')
  }
}

const fileUploadLink = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  const response = await shortLeaveStore.fetchFileUpload(formData)
  attachment.value = response?.url || null
  if (response?.url) {
    await uploadShortLeaveAttachment()
  } else {
    toast.error('Failed to upload file!')
  }
}

const formatDate = (dateString) =>
  dateString ? new Date(dateString).toISOString().slice(0, 10) : 'N/A'

const formatTime = (timeString) => {
  if (!timeString) return 'N/A'
  const [hour, minute] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hour || 0, minute || 0)
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const onAction = async () => {
  await load()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="short-leave-title"
    >
      <!-- overlay -->
      <div class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 md:p-6 shadow-2xl print:static print:overflow-visible" @click="close"></div>

      <!-- modal -->
      <div
        class="fixed inset-0 flex items-center justify-center p-4"
        @keydown.esc="close"
      >
        <div
          class="relative w-full max-w-4xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto print:overflow-visible print:shadow-none print:max-h-none"
        >
          <!-- header -->
          <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white px-4 py-3 print:hidden">
            <h2 id="short-leave-title" class="title-lg">Short Leave Details</h2>
            <div class="flex items-center gap-2">
              <button class="btn-3" @click="close" aria-label="Close">
                <i class="far fa-times"></i>
                <span class="hidden md:inline">Close</span>
              </button>
            </div>
          </div>

          <!-- body -->
          <div class="p-4 md:p-8">
            <LoaderView v-if="loading" />
            <div v-else id="leave-application">
              <div class="flex justify-end">
                <div>Date: {{ formatDate(shortLeave?.created_at) }}</div>
              </div>

              <div>
                <p class="font-medium">
                  Name: <b>{{ shortLeave?.user?.name }}</b>
                </p>
                <div class="gap-y-1">
                  <p>Designation: <b>{{ shortLeave?.user?.designation?.title }}</b></p>
                </div>
                <div class="gap-y-1">
                  <p>Department: <b>{{ shortLeave?.user?.company?.name }}</b></p>
                </div>
              </div>

              <div>
                <div class="grid md:grid-cols-2">
                  <div>
                    <b>From:</b>
                    {{ shortLeave?.start_time ? formatTime(shortLeave?.start_time) : '' }}
                  </div>
                  <div>
                    <b>To:</b>
                    {{ shortLeave?.end_time ? formatTime(shortLeave?.end_time) : '' }}
                  </div>
                  <div><b>Short Leave Date:</b> {{ shortLeave?.date }}</div>
                  <div><b>Total Minutes:</b> {{ shortLeave?.total_minutes }}</div>
                </div>

                <div class="grid md:grid-cols-3 gap-x-4 pt-2 md:justify-between items-end md:items-start">
                  <div class="md:col-span-2">
                    <b>Reason:</b> {{ shortLeave?.reason || 'N/A' }}
                  </div>
                  <ApprovalItem
                    :application="shortLeave"
                    type="short_leave_applications"
                    item="handover"
                    :onAction="onAction"
                    class="pt-10 ml-auto hidden md:block"
                  />
                </div>
              </div>

              <hr />

              <!-- Approval Details -->
              <div class="text-center">
                <h3 class="title-md">
                  Approvals
                  <span
                    :class="{
                      'text-yellow-500': shortLeave?.status === 'Pending',
                      'text-green-500': shortLeave?.status === 'Approved',
                      'text-red-500': shortLeave?.status === 'Rejected',
                    }"
                  >
                    ({{ shortLeave?.status || 'N/A' }})
                  </span>
                </h3>

                <div v-if="shortLeave?.status === 'Rejected'">
                  <div><b>Rejected By:</b> {{ shortLeave?.rejected_by_user?.name || 'N/A' }}</div>
                  <div><b>Rejection Reason:</b> {{ shortLeave?.rejection_reason || 'N/A' }}</div>
                </div>
              </div>

              <div class="grid grid-cols-2 text-sm md:text-base md:grid-cols-3 md:gap-x-4 gap-y-14 pt-14 items-end">
                <ApprovalItem
                  :application="shortLeave"
                  type="short_leave_applications"
                  item="handover"
                  :onAction="onAction"
                  class="md:hidden"
                />

                <ApprovalItem
                  :application="shortLeave"
                  type="short_leave_applications"
                  item="in_charge"
                  :onAction="onAction"
                />

                <ApprovalItem
                  :application="shortLeave"
                  type="short_leave_applications"
                  item="recommend_by"
                  :onAction="onAction"
                />

                <ApprovalItem
                  :application="shortLeave"
                  type="short_leave_applications"
                  item="approved_by"
                  :onAction="onAction"
                />
              </div>

              <!-- Attachment -->
              <div class="space-y-2">
                <label class="font-medium">Attachment</label>

                <div
                  v-if="shortLeave?.attachment && typeof shortLeave?.attachment === 'string'"
                  class="mb-2"
                >
                  <a :href="shortLeave?.attachment" target="_blank" class="text-blue-500 underline">
                    View Current File
                  </a>
                </div>
                <div v-else class="text-center text-lg italic text-gray-400">No attachment</div>

                <div v-if="authStore?.user?.id === shortLeave?.user_id" class="print:hidden">
                  <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />
                </div>
              </div>

              <!-- Share / Screenshot -->
              <ShareComponent class="print:hidden">
                <ScreenshotCapture targetId="leave-application" platform="whatsapp" />
              </ShareComponent>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Optional: remove modal rounding in print */
@media print {
  .rounded-lg { border-radius: 0 !important; }
}
</style>
