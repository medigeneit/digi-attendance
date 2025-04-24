<template>
  <div v-if="userApprovalRole && leaveApplication" class="text-center space-y-2 print:hidden">
    <!-- Note Input (conditionally shown) -->
    <div v-if="showRejectNote" class="mt-2">
      <textarea
        v-model="rejectionReason"
        class="w-full border rounded-md p-2 text-sm"
        placeholder="Enter rejection note"
      ></textarea>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button class="btn-2" @click="userApprovalRole.action(leaveApplication.id)">Approve</button>
      <button class="btn-1" @click="toggleRejectNote">Reject</button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

const authStore = useAuthStore()
const leaveApplicationStore = useLeaveApplicationStore()
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

// Approval Role Config
const approvalRoles = [
  {
    key: 'handover',
    approved_field: 'handover_user_id',
    approved_by_field: null,
    label: 'Handover',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await leaveApplicationStore.acceptHandover(id)
        await refresh(id)
      }
    },
    condition: () =>
      !leaveApplication.value?.status && leaveApplication.value?.handover_user_id === user.value.id,
  },
  {
    key: 'in_charge',
    approved_field: 'in_charge_user_id',
    approved_by_field: 'approval_in_charge_user_id',
    label: 'In-Charge',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await leaveApplicationStore.acceptInCharge(id)
        await refresh(id)
      }
    },
  },
  {
    key: 'coordinator',
    approved_field: 'coordinator_user_id',
    approved_by_field: 'approval_coordinator_user_id',
    label: 'Coordinator',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await leaveApplicationStore.acceptCoordinator(id)
        await refresh(id)
      }
    },
  },
  {
    key: 'operational_admin',
    approved_field: 'operational_admin_user_id',
    approved_by_field: 'approval_operational_admin_user_id',
    label: 'Operational Admin',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await leaveApplicationStore.acceptOperationalAdmin(id)
        await refresh(id)
      }
    },
  },
  {
    key: 'recommend_by',
    approved_field: 'recommend_by_user_id',
    approved_by_field: 'approval_recommend_by_user_id',
    label: 'Recommend By',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await leaveApplicationStore.acceptRecommendBy(id)
        await refresh(id)
      }
    },
  },
  {
    key: 'approved_by',
    approved_field: 'approved_by_user_id',
    approved_by_field: 'approval_approved_by_user_id',
    label: 'Approved By',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await leaveApplicationStore.acceptApprovedBy(id)
        await refresh(id)
      }
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
    await leaveApplicationStore.rejectLeaveApplication(leaveApplication.value.id, {
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
