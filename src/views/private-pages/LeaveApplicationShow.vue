<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useNotificationStore } from '@/stores/notification'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const leaveApplicationStore = useLeaveApplicationStore()
const router = useRouter()
const route = useRoute()
const loading = ref(true)

const rejectionModal = ref(false)

const rejectionReason = ref('')

const approvalModal = ref(false)

const approvalNote = ref('')

const leaveApplication = computed(() => leaveApplicationStore.leaveApplication)

onMounted(async () => {
  const { id } = route.params
  try {
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (error) {
    console.error('Failed to load leave application:', error)
  } finally {
    loading.value = false
  }
})

async function rejectApplication() {
  try {
    await leaveApplicationStore.rejectLeaveApplication(route.params.id, {
      rejection_reason: rejectionReason.value,
    })
    alert('Leave application rejected successfully!')
    rejectionModal.value = false
    rejectionReason.value = ''
    await leaveApplicationStore.fetchLeaveApplicationById(route.params.id)
    refresh()
  } catch (err) {
    alert(err.message)
  }
}

function openRejectionModal() {
  rejectionModal.value = true
}

let approvalUrl = ''

function openApprovalModal(url) {
  approvalModal.value = true
  approvalUrl = url
}

async function submitApproval() {
  if (approvalUrl === 'acceptApprovedByApplication') {
    acceptApprovedByApplication(route.params.id)
  }
  if (approvalUrl === 'acceptHandoverApplication') {
    acceptHandoverApplication(route.params.id)
  }
  if (approvalUrl === 'acceptInChargeApplication') {
    acceptInChargeApplication(route.params.id)
  }
  if (approvalUrl === 'acceptRecommendByApplication') {
    acceptRecommendByApplication(route.params.id)
  }
  approvalModal.value = false
}

async function acceptHandoverApplication(id) {
  try {
    await leaveApplicationStore.acceptHandover({ id, note: approvalNote.value })
    // alert('Handover accepted successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
    refresh()
  } catch (err) {
    alert(err.message)
  }
}

async function acceptInChargeApplication(id) {
  try {
    await leaveApplicationStore.acceptInCharge({ id, note: approvalNote.value })
    // alert('Leave Application Successfully Accepted!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
    refresh()
  } catch (err) {
    alert(err.message)
  }
}

async function acceptCoordinatorApplication(id) {
  try {
    await leaveApplicationStore.acceptCoordinator({ id, note: approvalNote.value })
    // alert('Coordinator accepted successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
    refresh()
  } catch (err) {
    alert(err.message)
  }
}

async function acceptOperationalAdminApplication(id) {
  try {
    await leaveApplicationStore.acceptOperationalAdmin({ id, note: approvalNote.value })
    // alert('Operational Admin accepted successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
    refresh()
  } catch (err) {
    alert(err.message)
  }
}

async function acceptRecommendByApplication(id) {
  try {
    await leaveApplicationStore.acceptRecommendBy({ id, note: approvalNote.value })
    // alert('Recommendation accepted successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
    refresh()
  } catch (err) {
    alert(err.message)
  }
}

async function acceptApprovedByApplication(id) {
  console.log(approvalNote.value)
  try {
    await leaveApplicationStore.acceptApprovedBy({ id, note: approvalNote.value })
    // alert('Leave Application approved successfully!')
    refresh()
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (err) {
    alert(err.message)
  }
}

async function refresh() {
  if (route?.query?.notifyId) {
    await notificationStore.markAsRead(route?.query?.notifyId)
  }
}

function print() {
  window.print()
}

const goBack = () => router.go(-1)

const totalWithWeekendDays = computed(() => {
  if (
    !leaveApplication.value ||
    !leaveApplication.value.last_working_date ||
    !leaveApplication.value.resumption_date
  ) {
    return 0 // Return 0 if leaveApplication is null or dates are missing
  }

  const lastWorkingDate = new Date(leaveApplication?.value.last_working_date)
  const resumptionDate = new Date(leaveApplication?.value.resumption_date)

  // Calculate the difference in milliseconds and convert to days
  const diffTime = resumptionDate - lastWorkingDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) // Convert milliseconds to days

  return diffDays - 1 // Exclude last working day itself
})
</script>

<template>
  <div class="my-container max-w-3xl space-y-6">
    <div class="flex items-center justify-between gap-2 print:hidden">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-xl flex-wrap text-center">Leave Application</h1>
      <div>
        <button class="btn-2" @click="print">
          <i class="far fa-print"></i>
          Print
        </button>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8">
      <div>
        <h1 class="title-lg text-center">
          {{ leaveApplication?.user?.company?.name }}
        </h1>
        <p class="text-center text-sm">
          {{ leaveApplication?.user?.company.address }}
        </p>
      </div>
      <div class="space-y-4">
        <div class="grid md:grid-cols-2 print:grid-cols-2 gap-8">
          <div>
            <p>To</p>
            <p class="font-bold">Managing Director</p>
            <p class="">{{ leaveApplication?.user?.company?.name }}</p>
            <p class="text-sm">{{ leaveApplication?.user?.company.address }}</p>
            <div>
              <p class="pt-6"><b>Subject:</b> Leave Application</p>
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
                  <tr
                    v-for="(leave, index) in leaveApplication?.leave_types"
                    :key="index"
                    class="border border-black"
                  >
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
                    <td class="border border-black px-2">
                      {{ totalWithWeekendDays }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h1 class="font-bold">Last Leave</h1>
              <div>
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
                    <tr
                      v-for="(leave, index) in leaveApplication?.last_leave?.types"
                      :key="index"
                      class="border border-black"
                    >
                      <td class="border border-black px-2">{{ leave?.type }}</td>
                      <td class="border border-black px-2">{{ leave?.days }}</td>
                    </tr>
                    <tr class="font-bold">
                      <td class="border border-black px-2">Total</td>
                      <td class="border border-black px-2">
                        {{
                          leaveApplication?.last_leave?.types
                            ? leaveApplication.last_leave.types.reduce(
                                (sum, leave) => sum + leave.days,
                                0,
                              )
                            : 0
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 class="font-bold">Leave Details:</h3>
          <div class="grid print:grid-cols-2 md:grid-cols-2 text-sm">
            <li><strong>Reason: </strong>{{ leaveApplication?.reason || 'No reason provided' }}</li>
            <li><strong>Leave Days:</strong> {{ leaveApplication?.leave_period }}</li>
            <li><strong>Total Days:</strong> {{ leaveApplication?.total_leave_days }}</li>
            <li><strong>Weekends:</strong> {{ leaveApplication?.user?.weekends?.join(', ') }}</li>
            <li><strong>Last Working Date:</strong> {{ leaveApplication?.last_working_date }}</li>
            <li><strong>Resumption Date:</strong> {{ leaveApplication?.resumption_date }}</li>
          </div>
        </div>
        <div class="text-sm">
          <p>
            <strong>Works in Hand: </strong
            >{{ leaveApplication?.works_in_hand || 'No details provided' }}
          </p>
        </div>
        <div class="pt-8 grid grid-cols-2">
          <div>
            <div class="text-sm">
              <hr class="w-44 border-black hidden print:block" />
              <p><strong>Applicant:</strong> {{ leaveApplication?.user?.name }}</p>
              <p><strong>Designation:</strong> {{ leaveApplication?.user?.designation?.title }}</p>
              <p><strong>Department:</strong> {{ leaveApplication?.user?.department?.name }}</p>
              <!-- <p><strong>Email:</strong> {{ leaveApplication?.user?.email }}</p> -->
              <p><strong>Phone:</strong> {{ leaveApplication?.user?.phone }}</p>
            </div>
          </div>

          <div class="flex flex-col justify-center items-center text-sm">
            <p>{{ leaveApplication?.handover_user?.name || 'Not assigned' }}</p>
            <div
              v-if="
                notificationStore.approvalPermissions?.allow_handover &&
                !leaveApplication?.status &&
                leaveApplication.handover_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-xs text-center">
                {{ leaveApplication?.user?.name }} has assigned you for his handover. <br />
                Do you agree?
              </p>
              <div class="flex justify-center gap-2">
                <button
                  class="font-bold text-lg text-green-600 px-2"
                  @click="openApprovalModal('acceptHandoverApplication')"
                >
                  ✔
                </button>
                <button class="px-2">❌</button>
              </div>
            </div>
            <hr class="w-44 border-black mt-2" />
            <h4 class="font-bold">
              Handover
              <span
                v-if="leaveApplication?.handover_user_id && leaveApplication?.status"
                class="text-green-600 print:text-black"
              >
                (✔)
              </span>
              <span
                v-if="leaveApplication?.handover_user_id && !leaveApplication?.status"
                class="pl-2 text-yellow-700"
                ><i class="fad fa-spinner"></i
              ></span>
            </h4>
            <p class="text-xs text-gray-500">
              {{ leaveApplication?.handover_note }}
            </p>
          </div>
        </div>

        <div>
          <h1 class="font-bold">Leave Balance</h1>
          <div class="overflow-x-auto">
            <table
              class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
            >
              <thead>
                <tr class="bg-gray-200">
                  <th class="border border-gray-500 px-4 py-0.5 text-left">Leave Type</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Total Days</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Used Days</th>
                  <th class="border border-gray-500 px-4 py-0.5 text-center">Remaining Days</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(balance, index) in leaveApplication?.leave_balance"
                  :key="index"
                  class="hover:bg-blue-200"
                >
                  <td class="border border-gray-500 px-4 py-0.5 text-left">
                    {{ balance.leave_type }}
                  </td>
                  <td class="border border-gray-500 px-4 py-0.5 text-center">
                    {{ balance.total_leave_days }}
                  </td>
                  <td class="border border-gray-500 px-4 py-0.5 text-center">
                    {{ balance.used_days }}
                  </td>
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
          <p><b>rejection Reason: </b> {{ leaveApplication.rejection_reason }}</p>
        </div>

        <div class="grid md:grid-cols-3 print:grid-cols-3 gap-4 text-sm items-end">
          <!-- In-Charge Approval -->
          <div class="flex flex-col justify-center items-center">
            <p v-if="leaveApplication?.in_charge_user">
              {{ leaveApplication?.in_charge_user?.name || '' }}
            </p>
            <p v-else class="text-center">
              {{ leaveApplication?.user?.leave_approval?.in_charge_user?.name || '' }}
            </p>

            <div
              v-if="
                notificationStore.approvalPermissions?.allow_in_charge &&
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.in_charge_user_id &&
                leaveApplication?.user?.leave_approval?.in_charge_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-xs text-center text-blue-600">
                {{ leaveApplication?.user?.name }} has submitted an application. <br />
                Will you forward it?
              </p>
              <div class="flex justify-center gap-4">
                <button
                  class="font-bold text-lg text-green-600"
                  @click="openApprovalModal('acceptInChargeApplication')"
                >
                  ✔
                </button>
                <button class="" @click="openRejectionModal">❌</button>
              </div>
            </div>

            <hr class="w-44 border-black mt-2" />
            <h4 class="font-bold">
              <p>
                In-Charge
                <span v-if="leaveApplication?.in_charge_user_id" class="text-green-600">(✔)</span>
                <span
                  v-if="
                    !leaveApplication?.in_charge_user_id &&
                    leaveApplication?.user?.leave_approval?.in_charge_user
                  "
                  class="pl-2 text-yellow-700"
                  ><i class="fad fa-spinner"></i
                ></span>
              </p>
            </h4>
            <p class="text-xs text-gray-500">
              {{ leaveApplication?.in_charge_note }}
            </p>
          </div>

          <!-- Coordinator Approval -->
          <div class="flex flex-col justify-center items-center">
            <p v-if="leaveApplication?.coordinator_user">
              {{ leaveApplication?.coordinator_user?.name || 'N/A' }}
            </p>
            <p v-else class="text-center">
              {{ leaveApplication?.user?.leave_approval?.coordinator_user?.name || 'N/A' }}
            </p>
            <div
              v-if="
                notificationStore.approvalPermissions?.allow_coordinator &&
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.coordinator_user_id &&
                leaveApplication?.user?.leave_approval?.coordinator_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-xs text-center text-blue-600">
                {{ leaveApplication?.user?.name }} has submitted an application. <br />
                Will you recommend it?
              </p>
              <div class="flex justify-center gap-4">
                <button
                  class="font-bold text-lg text-green-600"
                  @click="acceptCoordinatorApplication(leaveApplication.id)"
                >
                  ✔
                </button>
                <button class="" @click="openRejectionModal">❌</button>
              </div>
            </div>
            <hr class="w-44 border-black mt-2" />
            <p class="font-bold">
              Coordinator
              <span v-if="leaveApplication?.coordinator_user_id" class="text-green-600">(✔)</span>
              <span
                v-if="
                  !leaveApplication?.coordinator_user_id &&
                  leaveApplication?.user?.leave_approval?.coordinator_user
                "
                class="pl-2 text-yellow-700"
                ><i class="fad fa-spinner"></i
              ></span>
            </p>
          </div>

          <!-- Operational Admin Approval -->
          <div class="flex flex-col justify-center items-center">
            <p v-if="leaveApplication?.operational_admin_user">
              {{ leaveApplication?.operational_admin_user?.name || '' }}
            </p>
            <p v-else class="text-center">
              {{ leaveApplication?.user?.leave_approval?.operational_admin_user?.name || 'N/A' }}
            </p>
            <div
              v-if="
                notificationStore.approvalPermissions?.allow_operational_admin &&
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.operational_admin_user_id &&
                leaveApplication?.user?.leave_approval?.operational_admin_user_id ===
                  authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-xs text-center text-blue-600">
                {{ leaveApplication?.user?.name }} has submitted an application.<br />
                Will you recommend it?
              </p>
              <div class="flex justify-center gap-4">
                <button
                  class="font-bold text-lg text-green-600"
                  @click="acceptOperationalAdminApplication(leaveApplication.id)"
                >
                  ✔
                </button>
                <button class="" @click="openRejectionModal">❌</button>
              </div>
            </div>
            <hr class="w-44 border-black mt-2" />
            <p class="font-bold">
              Operational Admin
              <span v-if="leaveApplication?.operational_admin_user_id" class="text-green-600"
                >(✔)</span
              >
              <span
                v-if="
                  !leaveApplication?.operational_admin_user_id &&
                  leaveApplication?.user?.leave_approval?.operational_admin_user
                "
                class="pl-2 text-yellow-700"
                ><i class="fad fa-spinner"></i
              ></span>
            </p>
          </div>
        </div>

        <!-- Additional Approvals -->
        <div class="flex justify-evenly text-sm items-end">
          <!-- Recommend By Approval -->
          <div class="flex flex-col justify-center items-center">
            <p v-if="leaveApplication?.recommend_by_user">
              {{ leaveApplication?.recommend_by_user?.name || 'N/A' }}
            </p>
            <p v-else class="text-center">
              {{ leaveApplication?.user?.leave_approval?.recommend_by_user?.name || 'N/A' }}
            </p>
            <div
              v-if="
                notificationStore.approvalPermissions?.allow_recommend_by &&
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.recommend_by_user_id &&
                leaveApplication?.user?.leave_approval?.recommend_by_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-xs text-center text-blue-600">
                {{ leaveApplication?.user?.name }} has submitted an application.<br />
                Will you recommend it?
              </p>
              <div class="flex justify-center gap-4">
                <button
                  class="font-bold text-lg text-green-600"
                  @click="openApprovalModal('acceptRecommendByApplication')"
                >
                  ✔
                </button>
                <button class="" @click="openRejectionModal">❌</button>
              </div>
            </div>
            <hr class="w-44 border-black mt-2" />
            <p class="font-bold">
              Recommend By
              <span v-if="leaveApplication?.recommend_by_user_id" class="text-green-600">(✔)</span>
              <span
                v-if="
                  !leaveApplication?.recommend_by_user_id &&
                  leaveApplication?.user?.leave_approval?.recommend_by_user
                "
                class="pl-2 text-yellow-700"
                ><i class="fad fa-spinner"></i
              ></span>
            </p>
            <p class="text-xs text-gray-500">
              {{ leaveApplication?.recommend_note }}
            </p>
          </div>

          <!-- Approved By Approval -->
          <div class="flex flex-col justify-center items-center">
            <p v-if="leaveApplication?.approved_by_user">
              {{ leaveApplication?.approved_by_user?.name || '' }}
            </p>
            <p v-else class="text-center">
              {{ leaveApplication?.user?.leave_approval?.approved_by_user?.name || '' }}
            </p>

            <div
              v-if="
                notificationStore.approvalPermissions?.allow_approved_by &&
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.approved_by_user_id &&
                leaveApplication?.user?.leave_approval?.approved_by_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-xs text-center text-blue-600">
                {{ leaveApplication?.user?.name }} has submitted an application.<br />
                Will you accept it?
              </p>
              <div class="flex justify-center gap-4">
                <button
                  class="font-bold text-lg text-green-600"
                  @click="openApprovalModal('acceptApprovedByApplication')"
                >
                  ✔
                </button>
                <button class="" @click="openRejectionModal">❌</button>
              </div>
            </div>
            <hr class="w-44 border-black mt-2" />
            <p class="font-bold">
              Approved By
              <span v-if="leaveApplication?.approved_by_user_id" class="text-green-600">(✔)</span>
              <span
                v-if="
                  !leaveApplication?.approved_by_user_id &&
                  leaveApplication?.user?.leave_approval?.approved_by_user
                "
                class="pl-2 text-yellow-700"
                ><i class="fad fa-spinner"></i
              ></span>
            </p>
            <p class="text-xs text-gray-500">
              {{ leaveApplication?.approval_note }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <ShareComponent />
  </div>
  <div v-if="approvalModal" class="modal-bg">
    <div class="modal-card">
      <h3 class="title-lg">Accept Application</h3>
      <input
        v-model="approvalNote"
        rows="4"
        placeholder="Enter accept note..."
        class="w-full border rounded-lg p-2 text-gray-700"
      />
      <div class="flex justify-end gap-2 mt-4">
        <button class="btn-3" @click="approvalModal = false">Cancel</button>
        <button class="btn-2 bg-red-500 text-white" @click="submitApproval">Confirm</button>
      </div>
    </div>
  </div>
  <div v-if="rejectionModal" class="modal-bg">
    <div class="modal-card">
      <h3 class="title-lg">Reject Application</h3>
      <textarea
        v-model="rejectionReason"
        rows="4"
        placeholder="Enter rejection reason..."
        class="w-full border rounded-lg p-2 text-gray-700"
      ></textarea>
      <div class="flex justify-end gap-2 mt-4">
        <button class="btn-3" @click="rejectionModal = false">Cancel</button>
        <button class="btn-2 bg-red-500 text-white" @click="rejectApplication">Confirm</button>
      </div>
    </div>
  </div>
</template>
