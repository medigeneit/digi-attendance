<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const manualAttendanceStore = useManualAttendanceStore()

const loading = computed(() => manualAttendanceStore.loading)
const manualAttendance = computed(() => manualAttendanceStore.manualAttendance)

/* ---------------- formatting helpers ---------------- */
const formatDate = (val) => {
  if (!val) return 'N/A'
  return new Date(val).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
const formatTime = (val) => {
  if (!val) return 'N/A'
  return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const requestDate = computed(() => {
  // Prefer check_in date, fallback check_out date
  return manualAttendance.value?.check_in || manualAttendance.value?.check_out || null
})

const showForgetPunchType = computed(() => manualAttendance.value?.type === 'Forget Punch')
const showOffsiteType = computed(() => manualAttendance.value?.type === 'Offsite Work')

const punchTypeLabel = computed(() => {
  const pt = manualAttendance.value?.punch_type
  if (!pt) return 'N/A'
  return pt === 'entry' ? 'Entry' : pt === 'exit' ? 'Exit' : 'Both'
})

const offsiteTypeLabel = computed(() => {
  const ot = manualAttendance.value?.offsite_type
  if (!ot) return 'N/A'
  return ot === 'pre' ? 'Before Office (Pre)' : ot === 'post' ? 'After Office (Post)' : 'Both'
})

const statusClass = computed(() => {
  const s = manualAttendance.value?.status
  return s === 'Pending'
    ? 'text-yellow-500'
    : s === 'Approved'
      ? 'text-green-500'
      : s === 'Rejected'
        ? 'text-red-500'
        : 'text-slate-500'
})

/* ---------------- lifecycle ---------------- */
onMounted(async () => {
  const { id } = route.params
  try {
    await manualAttendanceStore.fetchManualAttendanceById(id)
  } catch (err) {
    console.error('Failed to fetch manual attendance details:', err)
  }
})

const goBack = () => router.go(-1)
const print = () => window.print()

const onAction = async () => {
  await manualAttendanceStore.fetchManualAttendanceById(route.params.id)
}
</script>

<template>
  <div class="my-container max-w-3xl space-y-6">
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

    <div v-else class="card-bg p-4 md:p-8 space-y-6">
      <!-- Header summary -->
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p class="text-sm text-slate-600">
            Date: <b class="text-slate-900">{{ formatDate(requestDate) }}</b>
          </p>
        </div>

        <div class="text-sm md:text-base">
          <span class="font-semibold">Status: </span>
          <span :class="statusClass">({{ manualAttendance?.status || 'N/A' }})</span>
        </div>
      </div>

      <!-- Request info -->
      <div class="grid md:grid-cols-2 gap-3 text-sm md:text-base">
        <div>
          <b>Type:</b> {{ manualAttendance?.type || 'N/A' }}
        </div>

        <div v-if="showForgetPunchType">
          <b>Forget Punch Type:</b> {{ punchTypeLabel }}
        </div>

        <div v-if="showOffsiteType">
          <b>Offsite Work Type:</b> {{ offsiteTypeLabel }}
        </div>

        <div v-if="manualAttendance?.check_in">
          <b>Check-In:</b> {{ formatTime(manualAttendance?.check_in) }}
        </div>

        <div v-if="manualAttendance?.check_out">
          <b>Check-Out:</b> {{ formatTime(manualAttendance?.check_out) }}
        </div>

        <div class="md:col-span-2">
          <b>Reason:</b> {{ manualAttendance?.description || 'N/A' }}
        </div>
      </div>

      <!-- Employee signature block -->
      <div class="pt-6">
        <hr class="w-44 border-black mb-2" />
        <p>
          Name: <b>{{ manualAttendance?.user?.name || 'N/A' }}</b>
        </p>
        <div class="text-sm text-slate-700">
          <p>Designation: <b>{{ manualAttendance?.user?.designation?.title || 'N/A' }}</b></p>
          <p>Department: <b>{{ manualAttendance?.user?.department?.name || 'N/A' }}</b></p>
        </div>
      </div>

      <hr />

      <!-- Approval Details -->
      <div class="space-y-2">
        <!-- <h3 class="title-md">
          Approvals
          <span :class="statusClass">({{ manualAttendance?.status || 'N/A' }})</span>
        </h3> -->

        <div v-if="manualAttendance?.status === 'Rejected'" class="rounded-lg bg-red-50 border border-red-200 p-3">
          <div><b>Rejected By:</b> {{ manualAttendance?.rejected_by_user?.name || 'N/A' }}</div>
          <div><b>Rejection Reason:</b> {{ manualAttendance?.rejection_reason || 'N/A' }}</div>
        </div>
      </div>

      <!-- Approver timeline -->
      <div
        v-if="manualAttendance"
        class="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5 items-end"
      >
        <ApprovalItem
          :application="manualAttendance"
          type="manual_attendance_applications"
          item="in_charge"
          :onAction="onAction"
        />

        <ApprovalItem
          :application="manualAttendance"
          type="manual_attendance_applications"
          item="recommend_by"
          :onAction="onAction"
        />

        <ApprovalItem
          :application="manualAttendance"
          type="manual_attendance_applications"
          item="approved_by"
          :onAction="onAction"
        />
      </div>
    </div>

    <ShareComponent />
  </div>
</template>
