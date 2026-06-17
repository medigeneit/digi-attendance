<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ScreenshotCapture from '@/components/common/ScreenshotCapture.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useShortLeaveStore } from '@/stores/short-leave'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast          = useToast()
const router         = useRouter()
const route          = useRoute()
const shortLeaveStore = useShortLeaveStore()
const authStore      = useAuthStore()

const loading    = computed(() => shortLeaveStore.loading)
const shortLeave = computed(() => shortLeaveStore.shortLeave)

const STD_STEP_DEFS = [
  { key: 'handover',          label: 'Handover' },
  { key: 'in_charge',         label: 'In Charge' },
  { key: 'coordinator',       label: 'Coordinator' },
  { key: 'operational_admin', label: 'Operational Admin' },
  { key: 'recommend_by',      label: 'Recommend By' },
  { key: 'approved_by',       label: 'Approved By' },
]

onMounted(async () => {
  try {
    await shortLeaveStore.fetchShortLeaveById(route.params.id)
  } catch (err) {
    console.error('Failed to fetch short leave details:', err)
  }
})

const goBack   = () => router.go(-1)
const print    = () => window.print()
const onAction = () => shortLeaveStore.fetchShortLeaveById(route.params.id)

const approvalSteps = computed(() => {
  const apiSteps = (shortLeave.value?.approval_steps || [])
  if (apiSteps.length) return apiSteps

  // Fallback: derive steps locally from user.short_leave_approval (old applications without snapshot)
  const rule  = shortLeave.value?.user?.short_leave_approval
  const steps = []
  for (const s of STD_STEP_DEFS) {
    if (s.key === 'handover') {
      if (shortLeave.value?.handover_user_id) steps.push(s)
    } else if (rule?.[`${s.key}_user_id`] != null) {
      steps.push(s)
    }
  }
  return steps
})

const fmtDate = (v) => {
  if (!v) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v))
  } catch { return '—' }
}

const fmtTime = (v) => {
  if (!v) return '—'
  const [h, m] = v.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m)
  return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const fileUploadLink = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  const response = await shortLeaveStore.fetchFileUpload(formData)
  if (response?.url) {
    await shortLeaveStore.uploadShortLeaveAttachment(route.params.id, { attachment: response.url })
    toast.success('File uploaded successfully!')
  } else {
    toast.error('Failed to upload file!')
  }
}
</script>

<template>
  <div class="my-container max-w-2xl space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between gap-2 print:hidden">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg text-center">Short Leave Details</h1>
      <button class="btn-2" @click="print">
        <i class="far fa-print"></i>
        Print
      </button>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="shortLeave" class="card-bg p-4 md:p-8 space-y-4" id="leave-application">

      <h2 class="title-md">Short Leave Application</h2>

      <!-- Two-column detail grid -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">

        <!-- Left column -->
        <div class="space-y-1.5">
          <div class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Applied Date</span>
            <b class="text-gray-800">{{ fmtDate(shortLeave.created_at) }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Date</span>
            <b class="text-gray-800">{{ fmtDate(shortLeave.date) }}</b>
          </div>
          <div v-if="shortLeave.type" class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Type</span>
            <b class="text-gray-800">{{ shortLeave.type }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">From</span>
            <b class="text-gray-800">{{ fmtTime(shortLeave.start_time) }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">To</span>
            <b class="text-gray-800">{{ fmtTime(shortLeave.end_time) }}</b>
          </div>
        </div>

        <!-- Right column -->
        <div class="space-y-1.5">
          <div class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Total Minutes</span>
            <b class="text-gray-800">{{ shortLeave.total_minutes ?? '—' }}</b>
          </div>
          <div v-if="shortLeave.works_in_hand" class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Works in Hand</span>
            <b class="text-gray-800">{{ shortLeave.works_in_hand }}</b>
          </div>
        </div>
      </div>

      <!-- Reason — full width -->
      <div v-if="shortLeave.reason" class="text-sm flex gap-2">
        <span class="text-gray-400 w-32 shrink-0">Reason</span>
        <span class="font-semibold text-gray-800 w-full">{{ shortLeave.reason }}</span>
      </div>

      <!-- Employee signature block -->
      <div class="pt-4">
        <hr class="w-44 border-black" />
        <p class="text-lg font-bold text-blue-700 mt-0.5">{{ shortLeave.user?.name }}</p>
        <p class="text-sm text-gray-600">{{ shortLeave.user?.designation?.title }}</p>
        <p class="text-sm text-gray-500">{{ shortLeave.user?.department?.name }}</p>
      </div>

      <!-- Rejection details -->
      <div
        v-if="shortLeave.status === 'Rejected'"
        class="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm space-y-1"
      >
        <p>
          <span class="text-gray-500 font-medium">Rejected By:</span>
          <b class="text-red-700 ml-1">{{ shortLeave.rejected_by_user?.name || 'N/A' }}</b>
        </p>
        <p>
          <span class="text-gray-500 font-medium">Reason:</span>
          <span class="text-red-700 ml-1">{{ shortLeave.rejection_reason || 'N/A' }}</span>
        </p>
      </div>

      <hr class="border-gray-200" />

      <!-- Status badge -->
      <div class="flex justify-center">
        <span
          class="inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold ring-1 ring-inset"
          :class="{
            'bg-amber-50 text-amber-700 ring-amber-200':       !shortLeave.status || shortLeave.status === 'Pending',
            'bg-emerald-50 text-emerald-700 ring-emerald-200': shortLeave.status === 'Approved',
            'bg-red-50 text-red-700 ring-red-200':             shortLeave.status === 'Rejected',
          }"
        >
          {{ shortLeave.status || 'Pending' }}
        </span>
      </div>

      <!-- Dynamic approval items — only configured steps -->
      <div
        v-if="approvalSteps.length"
        class="grid grid-cols-2 gap-x-4 gap-y-14 pt-6 items-end"
      >
        <ApprovalItem
          v-for="step in approvalSteps"
          :key="step.key"
          :application="shortLeave"
          type="short_leave_applications"
          :item="step.key"
          :onAction="onAction"
        />
      </div>

    </div>

    <!-- Attachment section -->
    <div class="card-bg p-4">
      <div
        v-if="shortLeave?.attachment && typeof shortLeave?.attachment === 'string'"
        class="mb-2"
      >
        <a :href="shortLeave.attachment" target="_blank" class="text-blue-500 underline">
          View Current File
        </a>
      </div>
      <div v-else class="text-center text-lg italic text-gray-400">No attachment</div>
      <div v-if="authStore?.user?.id === shortLeave?.user_id" class="mt-2">
        <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />
      </div>
    </div>

    <ShareComponent>
      <ScreenshotCapture targetId="leave-application" platform="whatsapp" />
    </ShareComponent>
  </div>
</template>
