<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const manualAttendanceStore = useManualAttendanceStore()
const authStore = useAuthStore()

const loading = computed(() => manualAttendanceStore.loading)
const manualAttendance = computed(() => manualAttendanceStore.manualAttendance)

onMounted(async () => {
  const { id } = route.params
  try {
    await manualAttendanceStore.fetchManualAttendanceById(id)
  } catch (err) {
    console.error('Failed to fetch manual attendance details:', err)
  }
})

const goBack = () => router.go(-1)

function print() {
  window.print()
}

const onAction = async () => {
  manualAttendanceStore.fetchManualAttendanceById(route.params.id)
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
      <div>
        <button class="btn-2" @click="print">
          <i class="far fa-print"></i>
          Print
        </button>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8">
      <h2 class="title-md">Manual Attendance Request</h2>
      <div>
        <div class="grid md:grid-cols-2">
          <div v-if="manualAttendance?.check_in">
            <b>Date:</b>
            {{
              new Date(manualAttendance?.check_in).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            }}
          </div>

          <div v-if="manualAttendance?.check_out">
            <b>Date:</b>
            {{
              new Date(manualAttendance?.check_out).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            }}
          </div>

          <div v-if="manualAttendance?.check_in">
            <b>Check-In:</b>
            {{
              manualAttendance?.check_in
                ? new Date(manualAttendance.check_in).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A'
            }}
          </div>
          <div v-if="manualAttendance?.check_out">
            <b>Check-Out:</b>
            {{
              manualAttendance?.check_out
                ? new Date(manualAttendance.check_out).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A'
            }}
          </div>

          <div><b>Type:</b> {{ manualAttendance?.type }}</div>
          <div><b>Reason:</b> {{ manualAttendance?.description || 'N/A' }}</div>
        </div>
        <div class="pt-10">
          <div>
            <hr class="w-44 border-black" />
            <p>
              Name: <b>{{ manualAttendance?.user.name }}</b>
            </p>
            <div class="text-sm">
              <p>
                Designation: <b>{{ manualAttendance?.user?.designation?.title }}</b>
              </p>
              <p>
                Department: <b>{{ manualAttendance?.user?.department?.name }}</b>
              </p>
            </div>
          </div>
        </div>
      </div>

      <hr />

      <!-- Approval Details -->
      <div>
        <h3 class="title-md">
          Approvals
          <span
            :class="{
              'text-yellow-500': manualAttendance?.status === 'Pending',
              'text-green-500': manualAttendance?.status === 'Approved',
              'text-red-500': manualAttendance?.status === 'Rejected',
            }"
          >
            ({{ manualAttendance?.status || 'N/A' }})
          </span>
        </h3>
        <div v-if="manualAttendance?.status === 'Rejected'">
          <div><b>Rejected By:</b> {{ manualAttendance?.rejected_by_user?.name || 'N/A' }}</div>
          <div><b>Rejection Reason:</b> {{ manualAttendance?.rejection_reason || 'N/A' }}</div>
        </div>
      </div>

      <div
        v-if="manualAttendance"
        class="grid grid-cols-2 text-sm md:text-base md:grid-cols-3 md:gap-x-4 gap-y-14 pt-14 items-end"
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
