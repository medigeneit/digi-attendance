<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ScreenshotCapture from '@/components/common/ScreenshotCapture.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useShortLeaveStore } from '@/stores/short-leave'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const notificationStore = useNotificationStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const shortLeaveStore = useShortLeaveStore()
const authStore = useAuthStore()
const attachment = ref(null)
const loading = ref(true)

const shortLeave = computed(() => shortLeaveStore.shortLeave)

onMounted(async () => {
  const { id } = route.params
  try {
    await shortLeaveStore.fetchShortLeaveById(id)
  } catch (err) {
    console.error('Failed to fetch short leave details:', err)
  } finally {
    loading.value = false
  }
})

const uploadShortLeaveAttachment = async () => {
  try {
    const payload = {
      attachment: attachment.value,
    }
    await shortLeaveStore.uploadShortLeaveAttachment(route.params.id, payload)
  } catch (err) {
    console.error('Failed to reject short leave:', err)
    alert('Failed to reject short leave.')
  }
}

const goBack = () => router.go(-1)

function print() {
  window.print()
}

const fileUploadLink = async (event) => {
  const file = event.target.files[0]
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await shortLeaveStore.fetchFileUpload(formData)
    attachment.value = response?.url
    if (response?.url) {
      uploadShortLeaveAttachment()
      toast.success('File uploaded successfully!')
    } else {
      toast.error('Failed to upload file!')
    }
  }
}

const formatDate = (dateString) => new Date(dateString).toISOString().slice(0, 10)

const formatTime = (timeString) => {
  if (!timeString) return 'N/A' // Return a fallback value if timeString is undefined

  const [hour, minute] = timeString.split(':').map(Number) // Extract hour & minute
  const date = new Date()
  date.setHours(hour, minute)

  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // Ensures AM/PM format
  })
}

const onAction = async () => {
  await shortLeaveStore.fetchShortLeaveById(route.params.id)
}
</script>

<template>
  <div class="my-container max-w-3xl space-y-6">
    <div class="flex items-center justify-between gap-2 print:hidden">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg flex-wrap text-center">Short Leave Details</h1>

      <div>
        <button class="btn-2" @click="print">
          <i class="far fa-print"></i>
          Print
        </button>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="bg-white rounded space-y-2 p-4 md:p-8" id="leave-application">
      <div>
        <h1 class="title-lg text-center">Short Leave Application</h1>
      </div>
      <div class="flex justify-end">
        <div>Date: {{ formatDate(shortLeave?.created_at) }}</div>
      </div>
      <div>
        <p class="font-medium">
          Name: <b>{{ shortLeave?.user?.name }}</b>
        </p>
        <div class="gap-y-1">
          <p>
            Designation: <b>{{ shortLeave?.user?.designation?.title }}</b>
          </p>
        </div>
        <div class="gap-y-1">
          <p>
            Department: <b>{{ shortLeave?.user?.company?.name }}</b>
          </p>
        </div>
      </div>
      <div class="">
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
          <div class="md:col-span-2"><b>Reason:</b> {{ shortLeave?.reason || 'N/A' }}</div>
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

      <div
        class="grid grid-cols-2 text-sm md:text-base md:grid-cols-3 md:gap-x-4 gap-y-14 pt-14 items-end"
      >
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
    </div>
    <div>
      <div>
        <label>Attachment</label>
        <!-- Show existing file link if available -->
        <div
          v-if="shortLeave?.attachment && typeof shortLeave?.attachment === 'string'"
          class="mb-2"
        >
          <a :href="shortLeave?.attachment" target="_blank" class="text-blue-500 underline">
            View Current File
          </a>
        </div>
        <!-- File Input -->
        <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />

        <!-- Show Selected File Name -->
        <!-- <p v-if="fileName" class="text-sm text-gray-600 mt-1">Selected File: {{ fileName }}</p> -->
      </div>
      <!-- <button type="button" v-if="attachment" class="btn-2" @click="uploadShortLeaveAttachment">
        Upload Attachment
      </button> -->
    </div>

    <ShareComponent>
      <ScreenshotCapture targetId="leave-application" platform="whatsapp" />
    </ShareComponent>
  </div>
</template>
