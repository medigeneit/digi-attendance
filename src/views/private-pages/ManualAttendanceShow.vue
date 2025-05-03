<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const manualAttendanceStore = useManualAttendanceStore()
const authStore = useAuthStore()
const approvalModal = ref(false)
const approvalNote = ref('')
const rejectionModal = ref(false)
const rejectionReason = ref('')

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

let action = ref('')

function openApprovalModal(url) {
  action.value = url
  approvalModal.value = true
}

async function submitApproval() {
  acceptManualAttendanceAction(action.value)
  approvalModal.value = false
}

const rejectManualAttendance = async () => {
  try {
    await manualAttendanceStore.rejectManualAttendance(route.params.id, rejectionReason.value)
    alert('Manual attendance rejected successfully!')
    rejectionModal.value = false
    rejectionReason.value = ''
    await manualAttendanceStore.fetchManualAttendanceById(route.params.id)
  } catch (err) {
    console.error('Failed to reject manual attendance:', err)
    alert('Failed to reject manual attendance.')
  }
}

const openRejectionModal = () => {
  rejectionModal.value = true
}

const acceptManualAttendanceAction = async (action) => {
  try {
    const { id } = route.params
    if (action === 'inCharge')
      await manualAttendanceStore.inChargeAccept({ id, note: approvalNote.value })
    if (action === 'recommend')
      await manualAttendanceStore.recommendByAccept({ id, note: approvalNote.value })
    if (action === 'approve')
      await manualAttendanceStore.approvedByAccept({ id, note: approvalNote.value })
    if (confirm('Are you sure you want to approve?')) {
      // alert(`${action} accepted successfully!`)
      await manualAttendanceStore.fetchManualAttendanceById(id)
    }
  } catch (err) {
    console.error(`Failed to accept ${action}:`, err)
    alert(`Failed to accept ${action}.`)
  }
}

const goBack = () => router.go(-1)

function print() {
  window.print()
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
            <div><b>Applicant</b></div>
            <p class="font-medium">{{ manualAttendance?.user.name }}</p>
            <div class="text-sm">
              <p>{{ manualAttendance?.user?.department?.name }}</p>
              <p>{{ manualAttendance?.user?.designation?.title }}</p>
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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="pt-10">
          <p v-if="manualAttendance?.in_charge_user">
            {{ manualAttendance?.in_charge_user?.name || '' }}
          </p>
          <p v-else>
            {{ manualAttendance?.user?.other_approval?.in_charge_user?.name || 'N/A' }}
          </p>

          <div
            v-if="
              manualAttendance?.status !== 'Rejected' &&
              manualAttendance?.status !== 'Approved' &&
              !manualAttendance?.in_charge_user_id &&
              manualAttendance?.user?.other_approval?.in_charge_user_id === authStore?.user?.id
            "
            class="print:hidden"
          >
            <p class="text-xs text-blue-600">
              {{ manualAttendance?.user?.name }} has submitted an "attendance request". <br />
              Will you forward it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="openApprovalModal('inCharge')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>

          <hr class="w-44 border-black" />
          <p class="font-bold">
            In-Charge
            <span v-if="manualAttendance?.in_charge_user_id" class="text-green-600">(✔)</span>
            <span
              v-if="
                manualAttendance?.user?.other_approval?.in_charge_user &&
                !manualAttendance?.in_charge_user_id
              "
              class="pl-2 text-yellow-700"
              ><i class="fad fa-spinner"></i
            ></span>
          </p>
          <p class="text-xs text-gray-500">
            {{ manualAttendance?.in_charge_note }}
          </p>
        </div>

        <div class="pt-10">
          <p v-if="manualAttendance?.recommend_by_user">
            {{ manualAttendance?.recommend_by_user?.name || '' }}
          </p>
          <p v-else>
            {{ manualAttendance?.user?.other_approval?.recommend_by_user?.name || 'N/A' }}
          </p>
          <div
            v-if="
              manualAttendance?.status !== 'Rejected' &&
              manualAttendance?.status !== 'Approved' &&
              !manualAttendance?.recommend_by_user_id &&
              manualAttendance?.user?.other_approval?.recommend_by_user_id === authStore.user?.id
            "
            class="print:hidden"
          >
            <p class="text-xs text-blue-600">
              {{ manualAttendance?.user?.name }} has submitted an "attendance request".<br />
              Will you recommend it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="openApprovalModal('recommend')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>
          <hr class="w-44 border-black" />
          <p class="font-bold">
            Recommend By
            <span v-if="manualAttendance?.recommend_by_user_id" class="text-green-600">(✔)</span>
            <span
              v-if="
                manualAttendance?.user?.other_approval?.recommend_by_user &&
                !manualAttendance?.recommend_by_user_id
              "
              class="pl-2 text-yellow-700"
              ><i class="fad fa-spinner"></i
            ></span>
          </p>
          <p class="text-xs text-gray-500">
            {{ manualAttendance?.recommend_note }}
          </p>
        </div>
      </div>

      <div class="flex flex-col pt-10">
        <p v-if="manualAttendance?.approved_by_user">
          {{ manualAttendance?.approved_by_user?.name || '' }}
        </p>
        <p v-else>
          {{ manualAttendance?.user?.other_approval?.approved_by_user?.name || 'N/A' }}
        </p>

        <div
          v-if="
            manualAttendance?.status !== 'Rejected' &&
            manualAttendance?.status !== 'Approved' &&
            !manualAttendance?.approved_by_user_id &&
            manualAttendance?.user?.other_approval?.approved_by_user_id === authStore.user?.id
          "
          class="print:hidden"
        >
          <p class="text-xs text-blue-600">
            {{ manualAttendance?.user?.name }} has submitted an "attendance request".<br />
            Will you accept it?
          </p>
          <div class="flex gap-4">
            <button class="font-bold text-lg text-green-600" @click="openApprovalModal('approve')">
              ✔
            </button>
            <button class="" @click="openRejectionModal">❌</button>
          </div>
        </div>

        <hr class="w-44 border-black" />
        <p class="font-bold">
          Approved By
          <span v-if="manualAttendance?.approved_by_user_id" class="text-green-600">(✔)</span>
          <span
            v-if="
              manualAttendance?.user?.other_approval?.approved_by_user &&
              !manualAttendance?.approved_by_user_id
            "
            class="pl-2 text-yellow-700"
            ><i class="fad fa-spinner"></i
          ></span>
        </p>
        <p class="text-xs text-gray-500">
          {{ manualAttendance?.approval_note }}
        </p>
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

  <!-- Rejection Modal -->
  <div v-if="rejectionModal" class="modal-bg">
    <div class="modal-card">
      <h3 class="title-lg">Reject Manual Attendance</h3>
      <textarea
        v-model="rejectionReason"
        rows="4"
        placeholder="Enter rejection reason..."
        class="w-full border rounded-lg p-2 text-gray-700"
      ></textarea>
      <div class="flex justify-end gap-2 mt-4">
        <button class="btn-3" @click="rejectionModal = false">Cancel</button>
        <button class="btn-2 bg-red-500 text-white" @click="rejectManualAttendance">Confirm</button>
      </div>
    </div>
  </div>
</template>
