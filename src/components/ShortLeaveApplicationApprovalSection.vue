<template>
  <div v-if="userApprovalRole && shortLeaveApplication" class="text-center space-y-2 print:hidden">
    <!-- Note Input (conditionally shown) -->

    <div v-if="approvalModal" class="modal-bg">
      <div class="modal-card">
        <h3 class="title-lg">Accept Application Note</h3>
        <input
          v-model="approvalNote"
          rows="4"
          placeholder="Enter rejection reason..."
          class="w-full border rounded-lg p-2 text-gray-700"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn-3" @click="approvalModal = false">Cancel</button>
          <button
            class="btn-2 bg-red-500 text-white"
            @click="userApprovalRole.action(shortLeaveApplication.id)"
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
        placeholder="Enter rejection note"
      ></textarea>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button v-if="!showRejectNote" class="btn-2" @click="openApprovalModal">Approve</button>
      <button class="btn-1" @click="toggleRejectNote">
        {{ showRejectNote ? 'Submit' : 'Reject' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useShortLeaveStore } from '@/stores/short-leave'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

const authStore = useAuthStore()
const shortLeaveStore = useShortLeaveStore()
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

const shortLeaveApplication = ref(null)

onMounted(() => {
  shortLeaveApplication.value = JSON.parse(JSON.stringify(props.application))
})

const showRejectNote = ref(false)
const rejectionReason = ref('')
const approvalModal = ref(false)
const approvalNote = ref('')

function openApprovalModal() {
  approvalModal.value = true
  showRejectNote.value = false
}

const approvalRoles = [
  {
    key: 'handover',
    approved_field: 'handover_user_id',
    approved_by_field: null,
    label: 'Handover',
    action: async (id) => {
      await shortLeaveStore.handoverAccept({ id, note: approvalNote.value })
      await refresh(id)
      approvalModal.value = false
    },
    condition: () =>
      !shortLeaveApplication.value?.status &&
      shortLeaveApplication.value?.handover_user_id === user.value.id,
  },
  {
    key: 'in_charge',
    approved_field: 'in_charge_user_id',
    approved_by_field: 'approval_in_charge_user_id',
    label: 'In-Charge',
    action: async (id) => {
      await shortLeaveStore.inChargeAccept({ id, note: approvalNote.value })
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
      await shortLeaveStore.recommendByAccept({ id, note: approvalNote.value })
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
      await shortLeaveStore.approvedByAccept({ id, note: approvalNote.value })
      await refresh(id)
      approvalModal.value = false
    },
  },
]

// Determine approval role
const userApprovalRole = computed(() => {
  return approvalRoles.find((role) => {
    if (!shortLeaveApplication.value) return false
    if (role.key === 'handover') {
      return role.condition()
    }
    return (
      shortLeaveApplication.value?.status !== 'Rejected' &&
      shortLeaveApplication.value?.status !== 'Approved' &&
      !shortLeaveApplication.value?.[role.approved_field] &&
      shortLeaveApplication.value?.[role.approved_by_field] === user.value.id
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
    await shortLeaveStore.rejectShortLeave(shortLeaveApplication.value.id, rejectionReason.value)
    alert('Application rejected!')
    rejectionReason.value = ''
    await refresh(shortLeaveApplication.value.id)
  } catch (err) {
    alert(err.message || 'Something went wrong!')
  }
}

// Refresh + mark read
async function refresh() {
  await notificationStore.markAsRead(props.notificationId)
}
</script>
