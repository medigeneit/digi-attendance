<template>
  <div v-if="userApprovalRole && exchange" class="text-center space-y-2 print:hidden">
    <!-- Note Input (conditionally shown) -->
    <div v-if="showRejectNote" class="mt-2">
      <textarea
        v-model="rejectionReason"
        class="w-full border rounded-md p-2 text-sm"
        placeholder="Enter rejection note"
      ></textarea>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button
        class="bg-green-500 text-white text-sm px-4 py-1 rounded hover:bg-green-600"
        @click="userApprovalRole.action(exchange.id)"
      >
        Approve
      </button>
      <button
        class="bg-red-500 text-white text-sm px-4 py-1 rounded hover:bg-red-600"
        @click="toggleRejectNote"
      >
        Reject
      </button>
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

// Approval Roles Config
const approvalRoles = [
  {
    key: 'handover',
    approved_field: 'handover_user_id',
    approved_by_field: null,
    label: 'Handover',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await exchangeStore.handoverAccept(id)
        await refresh(id)
      }
    },
    condition: () => !exchange.value?.status && exchange.value?.handover_user_id === user.value.id,
  },
  {
    key: 'in_charge',
    approved_field: 'in_charge_user_id',
    approved_by_field: 'approval_in_charge_user_id',
    label: 'In-Charge',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await exchangeStore.inChargeAccept(id)
        await refresh(id)
      }
      alert('In-Charge approved!')
    },
  },
  {
    key: 'recommend_by',
    approved_field: 'recommend_by_user_id',
    approved_by_field: 'approval_recommend_by_user_id',
    label: 'Recommend By',
    action: async (id) => {
      if (confirm('Are you sure you want to approve?')) {
        await exchangeStore.recommendByAccept(id)
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
      if (confirm('Are you sure to final approval?')) {
        await exchangeStore.approvedByAccept(id)
        await refresh(id)
      }
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
async function refresh(id) {
  await notificationStore.markAsRead(props.notificationId)
}
</script>
