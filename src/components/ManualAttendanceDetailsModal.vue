<!-- components/ManualAttendanceDetailsModal.vue -->
<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, ref, watch } from 'vue'

/* ---------- props & emits ---------- */
const props = defineProps({
  open: { type: Boolean, default: false },
  id: { type: [String, Number], required: true }, // manual attendance id
})
const emit = defineEmits(['update:open'])

/* ---------- stores & state ---------- */
const manualAttendanceStore = useManualAttendanceStore()
const authStore = useAuthStore()

const loading = computed(() => manualAttendanceStore.loading)
const manualAttendance = computed(() => manualAttendanceStore.manualAttendance)

/* ---------- helpers ---------- */
const close = () => emit('update:open', false)

const load = async () => {
  if (!props.id) return
  try {
    await manualAttendanceStore.fetchManualAttendanceById(props.id)
  } catch (err) {
    console.error('Failed to fetch manual attendance details:', err)
  }
}

watch(
  () => [props.open, props.id],
  async ([open]) => {
    if (open) await load()
  },
  { immediate: true }
)


const onAction = async () => {
  await manualAttendanceStore.fetchManualAttendanceById(props.id)
}

/* small formatters (optional) */
const formatDateGB = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A'
const formatTimeHM = (d) =>
  d
    ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A'
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="manual-attendance-title"
    >
      <!-- overlay -->
      <div class="fixed inset-0 bg-black/50" @click="close"></div>

      <!-- modal -->
      <div class="fixed inset-0 flex items-center justify-center p-4" @keydown.esc="close">
        <div
          class="relative w-full max-w-4xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto print:overflow-visible print:shadow-none print:max-h-none"
        >
          <!-- header -->
          <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white px-4 py-3 print:hidden">
            <button class="btn-3" @click="close">
              <i class="far fa-arrow-left"></i>
              <span class="hidden md:flex">Back</span>
            </button>
            <h1 id="manual-attendance-title" class="title-lg text-center">Manual Attendance Details</h1>
            <div>
             <button class="btn-3" @click="close">
                <i class="far fa-times"></i>
                <span class="hidden md:inline">Close</span>
              </button>
            </div>
          </div>

          <!-- body -->
          <div class="p-4 md:p-8">
            <LoaderView v-if="loading" />
            <div v-else class="card-bg p-4 md:p-8">
              <div>
                <div class="grid md:grid-cols-2">
                  <div v-if="manualAttendance?.check_in">
                    <b>Date:</b> {{ formatDateGB(manualAttendance?.check_in) }}
                  </div>

                  <div v-if="manualAttendance?.check_out">
                    <b>Date:</b> {{ formatDateGB(manualAttendance?.check_out) }}
                  </div>

                  <div v-if="manualAttendance?.check_in">
                    <b>Check-In:</b> {{ formatTimeHM(manualAttendance?.check_in) }}
                  </div>
                  <div v-if="manualAttendance?.check_out">
                    <b>Check-Out:</b> {{ formatTimeHM(manualAttendance?.check_out) }}
                  </div>

                  <div><b>Type:</b> {{ manualAttendance?.type }}</div>
                  <div><b>Reason:</b> {{ manualAttendance?.description || 'N/A' }}</div>
                </div>

                <div class="pt-10">
                  <div>
                    <hr class="w-44 border-black" />
                    <p>
                      Name: <b>{{ manualAttendance?.user?.name }}</b>
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

            <!-- footer actions -->
            <div class="mt-2 print:hidden">
              <ShareComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@media print {
  .rounded-lg { border-radius: 0 !important; }
}
</style>
