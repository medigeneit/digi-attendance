<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import DisplayFormattedWorkingHours from '@/components/overtime/DisplayFormattedWorkingHours.vue'
import { useOvertimeStore } from '@/stores/overtime'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const overtimeStore = useOvertimeStore()

const STEP_DEFS = [
  { key: 'handover',          label: 'Handover' },
  { key: 'in_charge',         label: 'In Charge' },
  { key: 'coordinator',       label: 'Coordinator' },
  { key: 'operational_admin', label: 'Operational Admin' },
  { key: 'recommend_by',      label: 'Recommend By' },
  { key: 'approved_by',       label: 'Approved By' },
]

const loading  = computed(() => overtimeStore.loading)
const overtime = computed(() => overtimeStore.overtime)

onMounted(async () => {
  try {
    await overtimeStore.fetchOvertimeById(route.params.id)
  } catch (err) {
    console.error('Failed to fetch overtime details:', err)
  }
})

const goBack = () => router.go(-1)
const print  = () => window.print()

const onAction = () => overtimeStore.fetchOvertimeById(route.params.id)

const approvalSteps = computed(() => {
  const apiSteps = overtime.value?.approval_steps || []
  if (apiSteps.length) return apiSteps

  // Fallback: build from user.overtime_approval for old applications without snapshot
  const rule = overtime.value?.user?.overtime_approval
  if (!rule) return []
  return STEP_DEFS.filter((s) => rule[`${s.key}_user_id`] || rule[`${s.key}_user`]?.id)
})

const fmt = (v) => {
  if (!v) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v))
  } catch { return '—' }
}
</script>

<template>
  <div class="my-container max-w-2xl space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg text-center">Overtime Details</h1>
      <button class="btn-2" @click="print">
        <i class="far fa-print"></i>
        Print
      </button>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="overtime" class="card-bg p-4 md:p-8 space-y-4">

      <!-- Title only -->
      <h2 class="title-md">Overtime Request</h2>

      <!-- Two-column detail grid (balanced) -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">

        <!-- Left column: dates + attendance -->
        <div class="space-y-1.5">
          <div v-if="overtime.created_at" class="flex gap-2">
            <span class="text-gray-400 w-28 shrink-0">Applied Date</span>
            <b class="text-gray-800">{{ fmt(overtime.created_at) }}</b>
          </div>
          <div v-if="overtime.date" class="flex gap-2">
            <span class="text-gray-400 w-28 shrink-0">Date</span>
            <b class="text-gray-800">{{ fmt(overtime.date) }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-28 shrink-0">Duty Type</span>
            <b class="text-gray-800">{{ overtime.duty_type || '—' }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-28 shrink-0">Check In</span>
            <b class="text-gray-800">{{ overtime.check_in || '—' }}</b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-28 shrink-0">Check Out</span>
            <b class="text-gray-800">{{ overtime.check_out || '—' }}</b>
          </div>
        </div>

        <!-- Right column: hours -->
        <div class="space-y-1.5">
          <div class="flex gap-2">
            <span class="text-gray-400 w-28 shrink-0">Working Hour</span>
            <b class="text-gray-800"><DisplayFormattedWorkingHours :workingHours="overtime.working_hours" /></b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-28 shrink-0">Request Hour</span>
            <b class="text-gray-800"><DisplayFormattedWorkingHours :workingHours="overtime.request_overtime_hours" /></b>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-400 w-28 shrink-0">Approved Hour</span>
            <b :class="overtime.approval_overtime_hours ? 'text-emerald-700' : 'text-gray-400'">
              <DisplayFormattedWorkingHours :workingHours="overtime.approval_overtime_hours" />
            </b>
          </div>
        </div>
      </div>

      <!-- Details — full width -->
      <div v-if="overtime.work_details" class="text-sm flex gap-2">
        <span class="text-gray-400 w-28 shrink-0">Details</span>
        <span class="font-semibold text-gray-800 w-full">{{ overtime.work_details }}</span>
      </div>

      <!-- Employee signature block -->
      <div class="pt-4">
        <hr class="w-44 border-black" />
        <p class="text-lg font-bold text-blue-700 mt-0.5">{{ overtime.user?.name }}</p>
        <p class="text-sm text-gray-600">{{ overtime.user?.designation?.title }}</p>
        <p class="text-sm text-gray-500">{{ overtime.user?.department?.name }}</p>
      </div>

      <!-- Rejection details -->
      <div v-if="overtime.status === 'Rejected'" class="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm space-y-1">
        <p><span class="text-gray-500 font-medium">Rejected By:</span> <b class="text-red-700">{{ overtime.rejected_by_user?.name || 'N/A' }}</b></p>
        <p><span class="text-gray-500 font-medium">Reason:</span> <span class="text-red-700">{{ overtime.rejection_reason || 'N/A' }}</span></p>
      </div>

      <!-- Approved hour note -->
      <div v-if="overtime.status === 'Approved'" class="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2 text-sm">
        <span class="text-gray-500 font-medium">Approved overtime:</span>
        <b class="text-emerald-700 ml-1"><DisplayFormattedWorkingHours :workingHours="overtime.approval_overtime_hours" /></b>
      </div>

      <hr class="border-gray-200" />

      <!-- Status badge — below the divider line, centered -->
      <div class="flex justify-center">
        <span
          class="inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold ring-1 ring-inset"
          :class="{
            'bg-amber-50 text-amber-700 ring-amber-200': overtime.status === 'Pending' || !overtime.status,
            'bg-emerald-50 text-emerald-700 ring-emerald-200': overtime.status === 'Approved',
            'bg-red-50 text-red-700 ring-red-200': overtime.status === 'Rejected',
          }"
        >
          {{ overtime.status || 'Pending' }}
        </span>
      </div>

      <!-- Approval items (signature style) -->
      <div
        v-if="approvalSteps.length"
        class="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-14 pt-6 items-end"
      >
        <ApprovalItem
          v-for="step in approvalSteps"
          :key="step.key"
          :application="overtime"
          type="overtime_applications"
          :item="step.key"
          :onAction="onAction"
        />
      </div>

    </div>

    <ShareComponent />
  </div>
</template>
