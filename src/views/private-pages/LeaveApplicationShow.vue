<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useAuthStore } from '@/stores/auth'
import LoaderView from '@/components/common/LoaderView.vue'

const authStore = useAuthStore()
const leaveApplicationStore = useLeaveApplicationStore()
const router = useRouter()
const route = useRoute()
const loading = ref(true)

const rejectionModal = ref(false)
const rejectionReason = ref('')

const leaveApplication = computed(() => leaveApplicationStore.leaveApplication)

onMounted(async () => {
  const { id } = route.params
  try {
    await leaveApplicationStore.fetchLeaveApplicationById(id)
    await leaveApplicationStore.fetchLeaveBalance(leaveApplicationStore?.leaveApplication?.user_id)
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
  } catch (err) {
    alert(err.message)
  }
}

function openRejectionModal() {
  rejectionModal.value = true
}

async function acceptHandoverApplication(id) {
  try {
    await leaveApplicationStore.acceptHandover(id)
    alert('Handover accepted successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (err) {
    alert(err.message)
  }
}

async function acceptInChargeApplication(id) {
  try {
    await leaveApplicationStore.acceptInCharge(id)
    alert('Leave Application Successfully Accepted!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (err) {
    alert(err.message)
  }
}

async function acceptCoordinatorApplication(id) {
  try {
    await leaveApplicationStore.acceptCoordinator(id)
    alert('Coordinator accepted successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (err) {
    alert(err.message)
  }
}

async function acceptOperationalAdminApplication(id) {
  try {
    await leaveApplicationStore.acceptOperationalAdmin(id)
    alert('Operational Admin accepted successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (err) {
    alert(err.message)
  }
}

async function acceptRecommendByApplication(id) {
  try {
    await leaveApplicationStore.acceptRecommendBy(id)
    alert('Recommendation accepted successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (err) {
    alert(err.message)
  }
}

async function acceptApprovedByApplication(id) {
  try {
    await leaveApplicationStore.acceptApprovedBy(id)
    alert('Leave Application approved successfully!')
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (err) {
    alert(err.message)
  }
}

function print() {
  window.print()
}

const goBack = () => router.go(-1)
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
          </div>
        </div>
        <div>
          <p class="">
            <b>Subject:</b> Application for <b>{{ leaveApplication?.leave_type?.name }}</b>
          </p>
        </div>
        <div>
          <h3 class="font-bold">Leave Details:</h3>
          <div class="grid print:grid-cols-2 md:grid-cols-2 text-sm">
            <li><strong>Start Date:</strong> {{ leaveApplication?.start_date }}</li>
            <li><strong>End Date:</strong> {{ leaveApplication?.end_date }}</li>
            <li><strong>Total Days:</strong> {{ leaveApplication?.total_days }}</li>
            <li><strong>Reason: </strong>{{ leaveApplication?.reason || 'No reason provided' }}</li>
            <li><strong>Weekends:</strong> {{ leaveApplication?.user.weekends.join(', ') }}</li>
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
                !leaveApplication?.status && leaveApplication.handover_user_id === authStore.user.id
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
                  @click="acceptHandoverApplication(leaveApplication.id)"
                >
                  ✔
                </button>
                <button class="px-2">❌</button>
              </div>
            </div>
            <hr class="w-44 border-black" />
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
                  v-for="(balance, index) in leaveApplicationStore.leaveBalance"
                  :key="index"
                  class="hover:bg-gray-100"
                >
                  <td class="border border-gray-500 px-4 py-0.5 text-left">
                    {{ balance.leave_type }}
                  </td>
                  <td class="border border-gray-500 px-4 py-0.5 text-center">
                    {{ balance.total_days }}
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
            <div
              v-if="
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.in_charge_user_id &&
                leaveApplication?.user?.leave_approval?.in_charge_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-center">
                {{ leaveApplication?.user?.leave_approval?.in_charge_user?.name || 'N/A' }}
              </p>
              <p class="text-xs text-center text-blue-600">
                {{ leaveApplication?.user?.name }} has submitted an application. <br />
                Will you forward it?
              </p>
              <div class="flex justify-center gap-4">
                <button
                  class="font-bold text-lg text-green-600"
                  @click="acceptInChargeApplication(leaveApplication.id)"
                >
                  ✔
                </button>
                <button class="" @click="openRejectionModal">❌</button>
              </div>
            </div>
            <p>{{ leaveApplication?.in_charge_user?.name || '' }}</p>
            <hr class="w-44 border-black" />
            <p class="font-bold">
              In-Charge
              <span v-if="leaveApplication?.in_charge_user_id" class="text-green-600">(✔)</span>
            </p>
          </div>

          <!-- Coordinator Approval -->
          <div class="flex flex-col justify-center items-center">
            <div
              v-if="
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.coordinator_user_id &&
                leaveApplication?.user?.leave_approval?.coordinator_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-center">
                {{ leaveApplication?.user?.leave_approval?.coordinator_user?.name || 'N/A' }}
              </p>
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
            <p>{{ leaveApplication?.coordinator_user?.name || '' }}</p>
            <hr class="w-44 border-black" />
            <p class="font-bold">
              Coordinator
              <span v-if="leaveApplication?.coordinator_user_id" class="text-green-600">(✔)</span>
            </p>
          </div>

          <!-- Operational Admin Approval -->
          <div class="flex flex-col justify-center items-center">
            <div
              v-if="
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.operational_admin_user_id &&
                leaveApplication?.user?.leave_approval?.operational_admin_user_id ===
                  authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-center">
                {{ leaveApplication?.user?.leave_approval?.operational_admin_user?.name || 'N/A' }}
              </p>
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
            <p>{{ leaveApplication?.operational_admin_user?.name || '' }}</p>
            <hr class="w-44 border-black" />
            <p class="font-bold">
              Operational Admin
              <span v-if="leaveApplication?.operational_admin_user_id" class="text-green-600"
                >(✔)</span
              >
            </p>
          </div>
        </div>

        <!-- Additional Approvals -->
        <div class="flex justify-evenly text-sm items-end">
          <!-- Recommend By Approval -->
          <div class="flex flex-col justify-center items-center">
            <div
              v-if="
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.recommend_by_user_id &&
                leaveApplication?.user?.leave_approval?.recommend_by_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-center">
                {{ leaveApplication?.user?.leave_approval?.recommend_by_user?.name || 'N/A' }}
              </p>
              <p class="text-xs text-center text-blue-600">
                {{ leaveApplication?.user?.name }} has submitted an application.<br />
                Will you recommend it?
              </p>
              <div class="flex justify-center gap-4">
                <button
                  class="font-bold text-lg text-green-600"
                  @click="acceptRecommendByApplication(leaveApplication.id)"
                >
                  ✔
                </button>
                <button class="" @click="openRejectionModal">❌</button>
              </div>
            </div>
            <p>{{ leaveApplication?.recommend_by_user?.name || '' }}</p>
            <hr class="w-44 border-black" />
            <p class="font-bold">
              Recommend By
              <span v-if="leaveApplication?.recommend_by_user_id" class="text-green-600">(✔)</span>
            </p>
          </div>

          <!-- Approved By Approval -->
          <div class="flex flex-col justify-center items-center">
            <div
              v-if="
                leaveApplication.status !== 'Rejected' &&
                leaveApplication.status !== 'Approved' &&
                !leaveApplication?.approved_by_user_id &&
                leaveApplication?.user?.leave_approval?.approved_by_user_id === authStore.user.id
              "
              class="print:hidden"
            >
              <p class="text-center">
                {{ leaveApplication?.user?.leave_approval?.approved_by_user?.name || 'N/A' }}
              </p>
              <p class="text-xs text-center text-blue-600">
                {{ leaveApplication?.user?.name }} has submitted an application.<br />
                Will you accept it?
              </p>
              <div class="flex justify-center gap-4">
                <button
                  class="font-bold text-lg text-green-600"
                  @click="acceptApprovedByApplication(leaveApplication.id)"
                >
                  ✔
                </button>
                <button class="" @click="openRejectionModal">❌</button>
              </div>
            </div>
            <p>{{ leaveApplication?.approved_by_user?.name || '' }}</p>
            <hr class="w-44 border-black" />
            <p class="font-bold">
              Approved By
              <span v-if="leaveApplication?.approved_by_user_id" class="text-green-600">(✔)</span>
            </p>
          </div>
        </div>
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
