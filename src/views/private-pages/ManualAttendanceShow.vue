<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route  = useRoute()
const manualAttendanceStore = useManualAttendanceStore()

const STEP_DEFS = [
  { key: 'in_charge',         label: 'In Charge' },
  { key: 'operational_admin', label: 'Operational Admin' },
  { key: 'recommend_by',      label: 'Recommend By' },
  { key: 'approved_by',       label: 'Approved By' },
]

const loading          = computed(() => manualAttendanceStore.loading)
const manualAttendance = computed(() => manualAttendanceStore.manualAttendance)

onMounted(async () => {
  try {
    await manualAttendanceStore.fetchManualAttendanceById(route.params.id)
  } catch (err) {
    console.error('Failed to fetch manual attendance details:', err)
  }
})

const goBack   = () => router.go(-1)
const print    = () => window.print()
const onAction = () => manualAttendanceStore.fetchManualAttendanceById(route.params.id)

const approvalSteps = computed(() => {
  const apiSteps = manualAttendance.value?.approval_steps || []
  if (apiSteps.length) return apiSteps

  // Fallback: build from user.manual_attendance_approval for old applications without snapshot
  const rule = manualAttendance.value?.user?.manual_attendance_approval
  if (!rule) return []
  return STEP_DEFS.filter((s) => rule[`${s.key}_user_id`] != null)
})

const fmtDate = (v) => {
  if (!v) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v))
  } catch { return '—' }
}

const fmtTime = (v) => {
  if (!v) return '—'
  try {
    const d = new Date(String(v).replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return 'â€”'
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch { return '—' }
}

const requestDate = computed(() =>
  manualAttendance.value?.check_in || manualAttendance.value?.check_out || null,
)

const punchTypeLabel = computed(() => {
  const pt = manualAttendance.value?.punch_type
  if (!pt) return '—'
  return pt === 'entry' ? 'Entry' : pt === 'exit' ? 'Exit' : 'Both'
})

const offsiteTypeLabel = computed(() => {
  const ot = manualAttendance.value?.offsite_type
  if (!ot) return '—'
  return ot === 'pre' ? 'Before Office (Pre)' : ot === 'post' ? 'After Office (Post)' : 'Both'
})
</script>

<template>
  <div class="my-container max-w-2xl space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg text-center">Manual Attendance Details</h1>
      <button class="btn-2" @click="print">
        <i class="far fa-print"></i>
        Print
      </button>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="manualAttendance" class="card-bg p-4 md:p-8 space-y-4">

      <h2 class="title-md">Manual Attendance Request</h2>

      <!-- Two-column detail grid -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">

        <!-- Left column -->
        <div class="space-y-1.5">
          <div v-if="manualAttendance.created_at" class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Applied Date</span>
            <b class="text-gray-800">{{ fmtDate(manualAttendance.created_at) }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Date</span>
            <b class="text-gray-800">{{ fmtDate(requestDate) }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Type</span>
            <b class="text-gray-800">{{ manualAttendance.type || '—' }}</b>
          </div>
          <div v-if="manualAttendance.type === 'Forget Punch'" class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Punch Type</span>
            <b class="text-gray-800">{{ punchTypeLabel }}</b>
          </div>
          <div v-if="manualAttendance.type === 'Offsite Work'" class="flex gap-2">
            <span class="text-gray-400 w-32 shrink-0">Offsite Type</span>
            <b class="text-gray-800">{{ offsiteTypeLabel }}</b>
          </div>
        </div>

        <!-- Right column -->
        <div class="space-y-1.5">
          <div class="flex gap-2">
            <span class="text-gray-400 w-24 shrink-0">Check In</span>
            <b class="text-gray-800">{{ fmtTime(manualAttendance.check_in) }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-24 shrink-0">Check Out</span>
            <b class="text-gray-800">{{ fmtTime(manualAttendance.check_out) }}</b>
          </div>
        </div>
      </div>

      <!-- Reason — full width -->
      <div v-if="manualAttendance.description" class="text-sm flex gap-2">
        <span class="text-gray-400 w-32 shrink-0">Reason</span>
        <span class="font-semibold text-gray-800 w-full">{{ manualAttendance.description }}</span>
      </div>

      <!-- Employee signature block -->
      <div class="pt-4">
        <hr class="w-44 border-black" />
        <p class="text-lg font-bold text-blue-700 mt-0.5">{{ manualAttendance.user?.name }}</p>
        <p class="text-sm text-gray-600">{{ manualAttendance.user?.designation?.title }}</p>
        <p class="text-sm text-gray-500">{{ manualAttendance.user?.department?.name }}</p>
      </div>

      <!-- Rejection details -->
      <div
        v-if="manualAttendance.status === 'Rejected'"
        class="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm space-y-1"
      >
        <p>
          <span class="text-gray-500 font-medium">Rejected By:</span>
          <b class="text-red-700 ml-1">{{ manualAttendance.rejected_by_user?.name || 'N/A' }}</b>
        </p>
        <p>
          <span class="text-gray-500 font-medium">Reason:</span>
          <span class="text-red-700 ml-1">{{ manualAttendance.rejection_reason || 'N/A' }}</span>
        </p>
      </div>

      <hr class="border-gray-200" />

      <!-- Status badge — below the divider -->
      <div class="flex justify-center">
        <span
          class="inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold ring-1 ring-inset"
          :class="{
            'bg-amber-50 text-amber-700 ring-amber-200':   manualAttendance.status === 'Pending' || !manualAttendance.status,
            'bg-emerald-50 text-emerald-700 ring-emerald-200': manualAttendance.status === 'Approved',
            'bg-red-50 text-red-700 ring-red-200':         manualAttendance.status === 'Rejected',
          }"
        >
          {{ manualAttendance.status || 'Pending' }}
        </span>
      </div>

      <!-- Approval items — only configured steps -->
      <div
        v-if="approvalSteps.length"
        class="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-14 pt-6 items-end"
      >
        <ApprovalItem
          v-for="step in approvalSteps"
          :key="step.key"
          :application="manualAttendance"
          type="manual_attendance_applications"
          :item="step.key"
          :onAction="onAction"
        />
      </div>

    </div>

    <ShareComponent />
  </div>
</template>
