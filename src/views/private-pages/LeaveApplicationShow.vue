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
const currentRejectId = ref(null)

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
    await leaveApplicationStore.rejectLeaveApplication(currentRejectId.value, {
      rejection_reason: rejectionReason.value,
    })
    alert('Leave application rejected successfully!')
    rejectionModal.value = false // Close modal
    rejectionReason.value = '' // Reset reason
    currentRejectId.value = null
    await leaveApplicationStore.fetchLeaveApplicationById(currentRejectId.value)
  } catch (err) {
    alert(err.message)
  }
}

function openRejectionModal(id) {
  currentRejectId.value = id
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

const goBack = () => router.go(-1)
</script>

<template>
  <div class="my-container space-y-6">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-xl flex-wrap text-center">Leave Application</h1>
      <div></div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8">
      <div class="flex flex-col md:flex-row justify-between">
        <div>
          <h1 class="title-md">
            {{ leaveApplication?.user?.company?.name }} Employee Leave Application
          </h1>
          <p class="">
            Application for: <b>{{ leaveApplication?.leave_type?.name }}</b>
          </p>
          <p>
            Application Status:
            <b
              :class="{
                'text-yellow-500': leaveApplication?.status === 'Pending',
                'text-green-500': leaveApplication?.status === 'Approved',
                'text-red-500': leaveApplication?.status === 'Rejected',
              }"
            >
              {{ leaveApplication?.status || 'N/A' }}
            </b>
          </p>
        </div>
      </div>
      <hr />
      <h3 class="text-lg font-semibold text-gray-700">Leave Details</h3>
      <div class="grid grid-cols-1 md:grid-cols-2">
        <li><strong>Start Date:</strong> {{ leaveApplication?.start_date }}</li>
        <li><strong>End Date:</strong> {{ leaveApplication?.end_date }}</li>
        <li><strong>Total Days:</strong> {{ leaveApplication?.total_days }}</li>
        <li><strong>Resumption Date:</strong> {{ leaveApplication?.resumption_date }}</li>
        <li>
          <strong>Reason for Leave: </strong>{{ leaveApplication?.reason || 'No reason provided' }}
        </li>
      </div>
      <hr />
      <h4 class="text-lg font-semibold text-gray-700">Handover details</h4>
      <div class="grid grid-cols-1 md:grid-cols-2">
        <li>
          <strong>Works in Hand: </strong
          >{{ leaveApplication?.works_in_hand || 'No details provided' }}
        </li>
        <li>
          <strong>Handover to: </strong
          >{{ leaveApplication?.handover_user?.name || 'Not assigned' }}
          <span v-if="leaveApplication?.status === 'Pending'">(✔)</span>
          <span
            ><button
              v-if="
                !leaveApplication?.status && leaveApplication.handover_user_id === authStore.user.id
              "
              @click="acceptHandoverApplication(leaveApplication.id)"
              class="btn-link"
            >
              Accept
            </button></span
          >
        </li>
      </div>
      <hr />
      <h3 class="text-lg font-semibold text-gray-700">Applicant Details</h3>
      <div class="p-4 rounded-lg bg-gray-100 border">
        <div class="">
          <p><strong>Name:</strong> {{ leaveApplication?.user?.name }}</p>
          <p><strong>Email:</strong> {{ leaveApplication?.user?.email }}</p>
          <p><strong>Phone:</strong> {{ leaveApplication?.user?.phone }}</p>
        </div>
      </div>
      <hr />
      <h3 class="text-lg font-semibold text-gray-700 mt-4">Approvals</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- In-Charge Approval -->
        <li>
          <strong>In-Charge:</strong>
          {{ leaveApplication?.user?.leave_approval?.in_charge_user?.name || 'N/A' }}
          <span v-if="leaveApplication?.in_charge_user_id">(✔)</span>
          <span
            v-else-if="
              leaveApplication?.user?.leave_approval?.in_charge_user_id === authStore.user.id
            "
          >
            <button class="btn-link" @click="acceptInChargeApplication(leaveApplication.id)">
              Accept
            </button>
            <button
              class="ps-2 btn-link text-red-500"
              @click="openRejectionModal(leaveApplication.id)"
            >
              Reject
            </button>
          </span>
        </li>

        <!-- Coordinator Approval -->
        <li>
          <strong>Coordinator:</strong>
          {{ leaveApplication?.user?.leave_approval?.coordinator_user?.name || 'N/A' }}
          <span v-if="leaveApplication?.coordinator_user_id">(✔)</span>
          <span
            v-else-if="
              leaveApplication?.user?.leave_approval?.coordinator_user_id === authStore.user.id
            "
          >
            <div class="flex gap-2">
              <button class="btn-link" @click="acceptCoordinatorApplication(leaveApplication.id)">
                Accept
              </button>
              <button
                class="btn-link text-red-500"
                @click="openRejectionModal(leaveApplication.id)"
              >
                Reject
              </button>
            </div>
          </span>
        </li>

        <!-- Operational Admin Approval -->
        <li>
          <strong>Operational Admin:</strong>
          {{ leaveApplication?.user?.leave_approval?.operational_admin_user?.name || 'N/A' }}
          <span v-if="leaveApplication?.operational_admin_user_id">(✔)</span>
          <span
            v-else-if="
              leaveApplication?.user?.leave_approval?.operational_admin_user_id ===
              authStore.user.id
            "
          >
            <button
              class="btn-link"
              @click="acceptOperationalAdminApplication(leaveApplication.id)"
            >
              Accept
            </button>
            <button class="btn-link text-red-500" @click="openRejectionModal(leaveApplication.id)">
              Reject
            </button>
          </span>
        </li>

        <!-- Recommend By Approval -->
        <li>
          <strong>Recommend By:</strong>
          {{ leaveApplication?.user?.leave_approval?.recommend_by_user?.name || 'N/A' }}
          <span v-if="leaveApplication?.recommend_by_user_id">(✔)</span>
          <span
            v-else-if="
              leaveApplication?.user?.leave_approval?.recommend_by_user_id === authStore.user.id
            "
          >
            <button class="btn-link" @click="acceptRecommendByApplication(leaveApplication.id)">
              Accept
            </button>
            <button class="btn-link text-red-500" @click="openRejectionModal(leaveApplication.id)">
              Reject
            </button>
          </span>
        </li>

        <li>
          <strong>Approved By:</strong>
          {{ leaveApplication?.user?.leave_approval?.approved_by_user?.name || 'N/A' }}
          <span v-if="leaveApplication?.approved_by_user_id">(✔)</span>
          <span
            v-else-if="
              leaveApplication?.user?.leave_approval?.approved_by_user_id === authStore.user.id
            "
          >
            <button class="btn-link" @click="acceptApprovedByApplication(leaveApplication.id)">
              Accept
            </button>
            <button class="btn-link text-red-500" @click="openRejectionModal(leaveApplication.id)">
              Reject
            </button>
          </span>
        </li>
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
