<template>
  <div v-if="userApprovalRole && leaveApplication" class="text-center space-y-2 print:hidden">
    <!-- Note Input (conditionally shown) -->

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
          <button
            class="btn-2 bg-red-500 text-white"
            @click="userApprovalRole.action(leaveApplication.id)"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRejectNote" class="mt-2">
      <textarea
        v-model="rejectionReason"
        class="w-full border rounded-md p-2 text-sm"
        placeholder="Enter accept note"
      ></textarea>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button class="btn-2" v-if="!showRejectNote" @click="openApprovalModal">Approve</button>
      <button class="btn-1" @click="toggleRejectNote">Reject</button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

const authStore = useAuthStore()
const manualAttendanceStore = useManualAttendanceStore()
const notificationStore = useNotificationStore()
const { user } = storeToRefs(authStore)

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  notificationId: {
    type: String,
    required: true,
  },
})

const leaveApplication = ref(null)
onMounted(() => {
  leaveApplication.value = JSON.parse(JSON.stringify(props.application)) // isolate clone
})

const showRejectNote = ref(false)
const rejectionReason = ref('')
const approvalModal = ref(false)
const approvalNote = ref('')

function openApprovalModal() {
  approvalModal.value = true
  showRejectNote.value = false
}

// Approval Role Config
const approvalRoles = [
  {
    key: 'in_charge',
    approved_field: 'in_charge_user_id',
    approved_by_field: 'approval_in_charge_user_id',
    label: 'In-Charge',
    action: async (id) => {
      await manualAttendanceStore.inChargeAccept({ id, note: approvalNote.value })
      await refresh(id)
      approvalModal.value = false
    },
  },
  {
    key: 'recommend_by',
    approved_field: 'recommend_by_user_id',
    approved_by_field: 'approval_recommend_by_user_id',
    label: 'Recommend By',
    action: async (id) => {
      await manualAttendanceStore.recommendByAccept({ id, note: approvalNote.value })
      await refresh(id)
      approvalModal.value = false
    },
  },
  {
    key: 'approved_by',
    approved_field: 'approved_by_user_id',
    approved_by_field: 'approval_approved_by_user_id',
    label: 'Approved By',
    action: async (id) => {
      await manualAttendanceStore.approvedByAccept({ id, note: approvalNote.value })
      await refresh(id)
      approvalModal.value = false
    },
  },
]

// Determine role
const userApprovalRole = computed(() => {
  return approvalRoles.find((role) => {
    if (!leaveApplication.value) return false
    if (role.key === 'handover') {
      return role.condition()
    }

    const isApproved = !!leaveApplication.value?.[role.approved_field]
    const isThisUser = leaveApplication.value?.[role.approved_by_field] === user.value.id

    return (
      leaveApplication.value?.status !== 'Rejected' &&
      leaveApplication.value?.status !== 'Approved' &&
      !isApproved &&
      isThisUser
    )
  })
})

// Reject logic
const toggleRejectNote = () => {
  if (showRejectNote.value && rejectionReason.value) {
    rejectApplication()
    showRejectNote.value = false
  } else {
    showRejectNote.value = true
  }
}

async function rejectApplication() {
  try {
    await manualAttendanceStore.rejectLeaveApplication(leaveApplication.value.id, {
      rejection_reason: rejectionReason.value,
    })
    alert('Application rejected!')
    rejectionReason.value = ''
    await refresh(leaveApplication.value.id)
  } catch (err) {
    alert(err.message || 'Something went wrong!')
  }
}

// Refresh and mark notification read
async function refresh(id) {
  await notificationStore.markAsRead(props.notificationId)
}
</script>
