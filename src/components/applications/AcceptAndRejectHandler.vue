<script setup>
import { useNotificationStore } from '@/stores/notification'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  notificationType: {
    type: String,
    required: true,
  },
  applicationId: {
    type: [String, Number],
    required: true,
  },
  onSuccess: {
    type: Function,
    default: null,
  },
  variant: {
    type: Number,
    default: 1,
  },
  acceptDisabled: {
    type: Boolean,
    default: false,
  },
  acceptDisabledMessage: {
    type: String,
    default: 'Action is not available.',
  },
})

const toast = useToast()

const notificationStore = useNotificationStore()

const confirmBtnRef = ref(null)
const cancelBtnRef = ref(null)

const currentAction = ref(null)
const note = ref('')
const actionError = ref('')

const isModalOpen = computed(() => currentAction.value !== null)

const modalTitle = computed(() =>
  currentAction.value === 'accept' ? 'Approve Application' : 'Reject Application',
)

function openModal(action) {
  if (action === 'accept' && props.acceptDisabled) {
    return toast.error(props.acceptDisabledMessage)
  }

  if (action === 'accept' || action === 'reject') {
    currentAction.value = action
    note.value = ''
    actionError.value = ''
    focusDefaultButton()
  }
}

function closeModal() {
  currentAction.value = null
  note.value = ''
  actionError.value = ''
}

async function handleConfirm() {
  if (notificationStore.loading) {
    return
  }

  actionError.value = ''

  if (currentAction.value === 'reject' && !note.value) {
    return toast.error('Rejection Reason is required!')
  }

  try {
    await notificationStore.updateSpecificNotification(
      props.notificationType,
      props.applicationId,
      currentAction.value,
      note.value,
    )

    if (props.onSuccess) {
      props.onSuccess()
    } else {
      notificationStore.fetchCountNotifications()
    }

    closeModal()
  } catch (err) {
    actionError.value = err?.response?.data?.message || notificationStore.error || 'Action failed!'
    toast.error(actionError.value)
  }
}

function handleKeydown(e) {
  if (!isModalOpen.value) return

  if (e.key === 'ArrowLeft') {
    cancelBtnRef.value?.focus()
  } else if (e.key === 'ArrowRight') {
    confirmBtnRef.value?.focus()
  }
}

function focusDefaultButton() {
  nextTick(() => {
    confirmBtnRef.value?.focus()
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div>
    <div class="flex justify-center items-center" :class="variant === 1 ? 'gap-5' : 'gap-2'">
      <button type="button" @click="openModal('accept')" title="Approve">
        <span
          v-if="variant === 1"
          class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
        >
          <i class="fas fa-check text-sm"></i>
        </span>
        <span v-if="variant === 2" class="btn-2">
          <i class="fas fa-check text-sm"></i>
          <span class="hidden md:inline">Approve</span>
        </span>
      </button>
      <button type="button" @click="openModal('reject')" title="Reject">
        <span
          v-if="variant === 1"
          class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        >
          <i class="fas fa-times text-sm"></i>
        </span>
        <span v-if="variant === 2" class="btn-1">
          <i class="fas fa-times text-sm"></i>
          <span class="hidden md:inline">Reject</span>
        </span>
      </button>
    </div>

    <!-- Single reusable modal -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex justify-center items-center bg-black/50"
      @click.self="closeModal"
    >
      <div class="modal-card">
        <h3 class="title-lg">{{ modalTitle }}</h3>
        <div
          v-if="actionError"
          class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
        >
          {{ actionError }}
        </div>
        <textarea
          v-model="note"
          rows="7"
          :placeholder="currentAction === 'accept' ? 'Approval Note...' : 'Rejection Reason...'"
          class="w-full border rounded-lg p-2 text-gray-700"
          :required="currentAction === 'reject'"
        ></textarea>
        <div class="flex justify-between gap-2 mt-4">
          <button ref="cancelBtnRef" class="btn-3 focus:ring-2 ring-offset-2" @click="closeModal">
            Cancel
          </button>
          <button
            ref="confirmBtnRef"
            class="focus:ring-2 ring-offset-2"
            :class="currentAction === 'reject' ? 'btn-2-red' : 'btn-2-green'"
            @click="handleConfirm"
          >
            Confirm
            <span class="hidden md:inline">{{ currentAction === 'accept' ? 'Approve' : 'Reject' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
