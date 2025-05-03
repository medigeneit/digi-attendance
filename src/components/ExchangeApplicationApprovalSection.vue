<template>
  <div v-if="userApprovalRole && exchange" class="text-center space-y-2 print:hidden">
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
          <button class="btn-2 bg-red-500 text-white" @click="userApprovalRole.action(exchange.id)">
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
      <button class="btn-2" v-if="!showRejectNote" @click="openApprovalModal">Approve</button>
      <button class="btn-4 bg-red-500 text-white" @click="toggleRejectNote">Reject</button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const exchangeStore = useExchangeStore()
const { user } = storeToRefs(authStore)

const props = defineProps({
  application: Object, // full exchange model from notification.event_model
  notificationId: {
    type: String,
    required: true,
  },
})

// Local reactive copy of application
const exchange = ref(null)
onMounted(() => {
  exchange.value = JSON.parse(JSON.stringify(props.application)) // clone to avoid global reactivity issues
})

const showRejectNote = ref(false)
const rejectionReason = ref('')
const approvalModal = ref(false)
const approvalNote = ref('')

function openApprovalModal() {
  approvalModal.value = true
  showRejectNote.value = false
}

// Approval Roles Config
const approvalRoles = [
  {
    key: 'handover',
    approved_field: 'handover_user_id',
    approved_by_field: null,
    label: 'Handover',
    action: async (id) => {
      await exchangeStore.handoverAccept({ id, note: approvalNote.value })
      await refresh()
      approvalModal.value = false
    },
    condition: () => !exchange.value?.status && exchange.value?.handover_user_id === user.value.id,
  },
  {
    key: 'in_charge',
    approved_field: 'in_charge_user_id',
    approved_by_field: 'approval_in_charge_user_id',
    label: 'In-Charge',
    action: async (id) => {
      await exchangeStore.inChargeAccept({ id, note: approvalNote.value })
      await refresh()
      approvalModal.value = false
    },
  },
  {
    key: 'recommend_by',
    approved_field: 'recommend_by_user_id',
    approved_by_field: 'approval_recommend_by_user_id',
    label: 'Recommend By',
    action: async (id) => {
      await exchangeStore.recommendByAccept({ id, note: approvalNote.value })
      await refresh()
      approvalModal.value = false
    },
  },
  {
    key: 'approved_by',
    approved_field: 'approved_by_user_id',
    approved_by_field: 'approval_approved_by_user_id',
    label: 'Approved By',
    action: async (id) => {
      await exchangeStore.approvedByAccept({ id, note: approvalNote.value })
      await refresh()
      approvalModal.value = false
    },
  },
]

// Determine current user's role
const userApprovalRole = computed(() => {
  return approvalRoles.find((role) => {
    if (!exchange.value) return false

    if (role.key === 'handover') {
      return role.condition()
    }

    return (
      exchange.value?.status !== 'Rejected' &&
      exchange.value?.status !== 'Approved' &&
      !exchange.value?.[role.approved_field] &&
      exchange.value?.[role.approved_by_field] === user.value.id
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
    await exchangeStore.rejectExchange(exchange.value.id, rejectionReason.value)
    alert('Exchange application rejected!')
    rejectionReason.value = ''
    await refresh(exchange.value.id)
  } catch (err) {
    alert(err.message || 'Something went wrong!')
  }
}

// Refresh and mark as read
async function refresh() {
  await notificationStore.markAsRead(props.notificationId)
}
</script>
