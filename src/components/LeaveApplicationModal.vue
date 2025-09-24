<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'

/* ---------- props & emits (JS) ---------- */
const props = defineProps({
  open: { type: Boolean, default: false },
  id:   { type: [String, Number, null], default: null }
})
const emit = defineEmits(['update:open', 'refetch'])

/* ---------- stores ---------- */
const authStore = useAuthStore()
const leaveApplicationStore = useLeaveApplicationStore()

/* ---------- state ---------- */
const loading = ref(false)
const attachment = ref(null)
const leaveApplication = computed(() => leaveApplicationStore.leaveApplication)

/* ---------- helpers ---------- */
function close () { emit('update:open', false) }
function onEsc (e) { if (e.key === 'Escape') close() }
function stop(e) { e.stopPropagation() }
function lockBodyScroll(lock = true){
  document.body.style.overflow = lock ? 'hidden' : ''
}

/* ---------- data fetch when modal opens ---------- */
async function fetchIfOpen() {
  if (!props.open || !props.id) return
  try {
    loading.value = true
    await leaveApplicationStore.fetchLeaveApplicationById(props.id)
  } catch (e) {
    console.error('Failed to load leave application:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (v) => {
  if (v) {
    lockBodyScroll(true)
    window.addEventListener('keydown', onEsc)
    fetchIfOpen()
  } else {
    lockBodyScroll(false)
    window.removeEventListener('keydown', onEsc)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  lockBodyScroll(false)
  window.removeEventListener('keydown', onEsc)
})


const onAction = async () => {
  if (!props.id) return
  await leaveApplicationStore.fetchLeaveApplicationById(props.id)
  emit('refetch')
}

/* ---------- computed ---------- */
const totalWithWeekendDays = computed(() => {
  const app = leaveApplication.value
  if (!app?.last_working_date || !app?.resumption_date) return 0
  const lastWorkingDate = new Date(app.last_working_date)
  const resumptionDate  = new Date(app.resumption_date)
  const diffTime = resumptionDate.getTime() - lastWorkingDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays - 1
})

/* ---------- file upload ---------- */
const uploadLeaveApplicationAttachment = async () => {
  if (!props.id) return
  try {
    await leaveApplicationStore.uploadLeaveApplicationAttachment(props.id, { attachment: attachment.value })
    await leaveApplicationStore.fetchLeaveApplicationById(props.id)
  } catch (err) {
    console.error('Failed to upload attachment:', err)
    alert('Failed to upload attachment.')
  }
}

const fileUploadLink = async (event) => {
  const file = event?.target?.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', 'leave-application')
  const response = await leaveApplicationStore.fetchFileUpload(formData)
  attachment.value = response?.url || null
  uploadLeaveApplicationAttachment()
}

/* ---------- format ---------- */
const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  const d = new Date(timestamp)
  const date = d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true })
  return `${date} , ${time}`
}
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-black/50"
        @click="close"
      >
        <!-- Dialog -->
        <div
          class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white px-6  shadow-2xl print:static print:overflow-visible"
          role="dialog"
          aria-modal="true"
          @click.stop="stop"
        >
          <!-- Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white px-4 py-3 print:hidden">
            <h2 class="title-md md:title-lg">Leave Application</h2>
            <div class="flex items-center gap-2">
              <button class="btn-3" @click="close" aria-label="Close">
                <i class="far fa-times"></i>
              </button>
            </div>
          </div>

          <LoaderView v-if="loading" />

          <!-- Body -->
          <div v-else class=" print:text-black py-2">
            <div class="space-y-2">
              <div class="grid md:grid-cols-2 print:grid-cols-2 gap-8">
                <div>
                  <p>To</p>
                  <p class="font-bold">Managing Director</p>
                  <p>{{ leaveApplication?.user?.company?.name }}</p>
                  <p class="text-sm">{{ leaveApplication?.user?.company?.address }}</p>
                  <div>
                    <p class="pt-6">
                      <b>Subject:</b>
                      Leave Application for
                      <template v-for="(leave, index) in leaveApplication?.leave_types" :key="index">
                        <span v-if="index && leave.days">,&nbsp;</span>
                        <span v-if="leave.days" class="font-semibold">{{ leave.type }}</span>
                      </template>
                    </p>
                  </div>
                </div>

                <div class="flex justify-end gap-4">
                  <div>
                    <h1 class="font-bold">Summary</h1>
                    <table class="table-auto border border-black bg-white text-xs">
                      <thead>
                        <tr class="bg-gray-200 border border-black">
                          <th class="border border-black px-2">Type</th>
                          <th class="border border-black px-2">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(leave, index) in leaveApplication?.leave_types" :key="index" class="border border-black">
                          <td class="border border-black px-2">{{ leave.type }}</td>
                          <td class="border border-black px-2">{{ leave.days }}</td>
                        </tr>
                        <tr>
                          <td class="border-black px-2">WL/GHD</td>
                          <td class="border border-black px-2">
                            {{ totalWithWeekendDays - leaveApplication?.leave_days?.length }}
                          </td>
                        </tr>
                        <tr class="font-bold">
                          <td class="border border-black px-2">Total</td>
                          <td class="border border-black px-2">{{ totalWithWeekendDays }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h1 class="font-bold">Last Leave</h1>
                    <table class="table-auto border border-black bg-white text-xs">
                      <thead>
                        <tr class="bg-gray-200 border border-black">
                          <th colspan="2" class="border border-black px-2">Date</th>
                        </tr>
                        <tr class="border border-black">
                          <td colspan="2" class="border border-black px-2 w-32">
                            {{ leaveApplication?.last_leave?.date || 'N/A' }}
                          </td>
                        </tr>
                        <tr class="bg-gray-200 border border-black">
                          <th class="border border-black px-2">Type</th>
                          <th class="border border-black px-2">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(leave, index) in leaveApplication?.last_leave?.types" :key="index" class="border border-black">
                          <td class="border border-black px-2">{{ leave?.type }}</td>
                          <td class="border border-black px-2">{{ leave?.days }}</td>
                        </tr>
                        <tr class="font-bold">
                          <td class="border border-black px-2">Total</td>
                          <td class="border border-black px-2">
                            {{
                              leaveApplication?.last_leave?.types
                                ? leaveApplication.last_leave.types.reduce((sum, leave) => sum + leave.days, 0)
                                : 0
                            }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="font-bold">Leave Details:</h3>
                <div class="grid print:grid-cols-2 md:grid-cols-2 text-sm">
                  <li class="list-none"><strong>Reason: </strong>{{ leaveApplication?.reason || 'No reason provided' }}</li>
                  <li class="list-none"><strong>Leave Days:</strong> {{ leaveApplication?.leave_period }}</li>
                  <li class="list-none"><strong>Total Days:</strong> {{ leaveApplication?.total_leave_days }}</li>
                  <li class="list-none"><strong>Weekends:</strong> {{ leaveApplication?.user?.assign_weekend?.weekends?.join(', ') }}</li>
                  <li class="list-none"><strong>Last Working Date:</strong> {{ leaveApplication?.last_working_date }}</li>
                  <li class="list-none"><strong>Resumption Date:</strong> {{ leaveApplication?.resumption_date }}</li>
                  <li class="list-none"><strong>Create Date:</strong> {{ formatDateTime(leaveApplication?.created_at) }}</li>
                </div>
              </div>

              <div class="text-sm">
                <p class="whitespace-pre-line">
                  <strong>Works in Hand: </strong>{{ leaveApplication?.works_in_hand || 'No details provided' }}
                </p>
              </div>

              <div class="pt-8 grid grid-cols-2">
                <div class="text-sm">
                  <hr class="w-44 border-black hidden print:block my-1" />
                  <p class='font-bold'>
                    <strong>Applicant: </strong>
                    <span class="text-blue-700 print:text-black">{{ leaveApplication?.user?.name }}</span>
                  </p>
                  <p><strong>Designation:</strong> {{ leaveApplication?.user?.designation?.title }}</p>
                  <p><strong>Department:</strong> {{ leaveApplication?.user?.department?.name }}</p>
                  <p><strong>Phone:</strong> {{ leaveApplication?.user?.phone }}</p>
                  <p><strong>Joining Date:</strong> {{ leaveApplication?.user?.joining_date }}</p>
                </div>

                <ApprovalItem
                  :application="leaveApplication"
                  type="leave_applications"
                  item="handover"
                  :onAction="onAction"
                />
              </div>

              <div>
                <h1 class="font-bold">Leave Balance</h1>
                <div class="overflow-x-auto">
                  <table class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm">
                    <thead>
                      <tr class="bg-gray-200">
                        <th class="border border-gray-500 px-4 py-0.5 text-left">Leave Type</th>
                        <th class="border border-gray-500 px-4 py-0.5 text-center">Total Days</th>
                        <th class="border border-gray-500 px-4 py-0.5 text-center">Used Days</th>
                        <th class="border border-gray-500 px-4 py-0.5 text-center">Remaining Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(balance, index) in leaveApplication?.leave_balance" :key="index" class="hover:bg-blue-200">
                        <td class="border border-gray-500 px-4 py-0.5 text-left">{{ balance.leave_type }}</td>
                        <td class="border border-gray-500 px-4 py-0.5 text-center">{{ balance?.total_leave_days }}</td>
                        <td class="border border-gray-500 px-4 py-0.5 text-center">{{ balance.used_days }}</td>
                        <td
                          class="border border-gray-500 px-4 py-0.5 text-center"
                          :class="{
                            'text-green-600 font-bold': balance.remaining_days > 0,
                            'text-red-600 font-bold': balance.remaining_days === 0,
                          }"
                        >
                          {{ balance.remaining_days }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="space-y-14">
                <p class="font-bold text-center text-lg">
                  Leave Approval:
                  <b
                    :class="{
                      'text-yellow-600': leaveApplication?.status === 'Pending',
                      'text-green-600': leaveApplication?.status === 'Approved',
                      'text-red-600': leaveApplication?.status === 'Rejected',
                    }"
                  >
                    {{ leaveApplication?.status || 'N/A' }}
                  </b>
                </p>

                <div v-if="leaveApplication?.status === 'Rejected'">
                  <p><b>Rejected by: </b> {{ leaveApplication?.rejected_by_user?.name }}</p>
                  <p><b>Rejection Reason: </b> {{ leaveApplication?.rejection_reason }}</p>
                </div>

                <div class="grid md:grid-cols-3 print:grid-cols-3 gap-4 text-sm items-end">
                  <ApprovalItem :application="leaveApplication" type="leave_applications" item="in_charge" :onAction="onAction" />
                  <ApprovalItem :application="leaveApplication" type="leave_applications" item="coordinator" :onAction="onAction" />
                  <ApprovalItem :application="leaveApplication" type="leave_applications" item="operational_admin" :onAction="onAction" />
                </div>

                <div class="flex justify-evenly text-sm items-end">
                  <ApprovalItem :application="leaveApplication" type="leave_applications" item="recommend_by" :onAction="onAction" />
                  <ApprovalItem :application="leaveApplication" type="leave_applications" item="approved_by" :onAction="onAction" />
                </div>
              </div>
            </div>

            <!-- Attachment -->
            <div class="pt-6">
              <label class="font-medium">Attachment</label>
              <div v-if="leaveApplication?.attachment && typeof leaveApplication?.attachment === 'string'" class="mb-2">
                <a :href="leaveApplication?.attachment" target="_blank" class="text-blue-500 underline">View Current File</a>
              </div>
              <div v-else class="text-sm italic text-gray-400">No attachment</div>

              <div v-if="leaveApplication?.user_id === authStore?.user?.id" class="mt-2">
                <input type="file" @change="fileUploadLink" class="w-full p-2 border rounded" />
              </div>
            </div>

            <ShareComponent />
          </div>

          <!-- Close (mobile footer) -->
          <div class="mb-2 flex justify-end gap-2 print:hidden">
            <button class="btn-3" @click="close">
              <i class="far fa-times"></i> Close
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }
@media print {
  .btn-2, .btn-3 { display: none !important; }
}
</style>
