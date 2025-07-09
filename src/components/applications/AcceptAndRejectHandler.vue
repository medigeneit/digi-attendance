<script setup>
import { useNotificationStore } from '@/stores/notification'
import { computed, ref } from 'vue'
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
})

const toast = useToast()

const notificationStore = useNotificationStore()

const currentAction = ref(null)
const note = ref('')

const isModalOpen = computed(() => currentAction.value !== null)

const modalTitle = computed(() =>
  currentAction.value === 'accept' ? 'Accept Application' : 'Reject Application',
)

const confirmButtonClass = computed(() =>
  currentAction.value === 'accept' ? 'btn-2' : 'btn-2 bg-red-500 text-white',
)

function openModal(action) {
  if (action === 'accept' || action === 'reject') {
    currentAction.value = action
    note.value = ''
  }
}

function closeModal() {
  currentAction.value = null
  note.value = ''
}

async function handleConfirm() {
  if (currentAction.value === 'reject' && !note.value) {
    return toast.error('Rejection Reason is required!')
  }

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
}
</script>

<template>
  <div>
    <div class="flex justify-center items-center" :class="variant === 1 ? 'gap-5' : 'gap-2'">
      <button @click="openModal('accept')">
        <span v-if="variant === 1" class="font-bold text-lg text-green-600">✔</span>
        <span v-if="variant === 2" class="btn-2">
          <span class="text-base scale-110">✔</span>
          <span class="hidden md:inline">Approve</span>
        </span>
      </button>
      <button @click="openModal('reject')">
        <span v-if="variant === 1" class="text-base">❌</span>
        <span v-if="variant === 2" class="btn-1">
          <span class="text-base">❌</span>
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
        <textarea
          v-model="note"
          rows="7"
          :placeholder="currentAction === 'accept' ? 'Accept Note...' : 'Rejection Reason...'"
          class="w-full border rounded-lg p-2 text-gray-700"
          :required="currentAction === 'reject'"
        ></textarea>
        <div class="flex justify-between gap-2 mt-4">
          <button class="btn-3" @click="closeModal">Cancel</button>
          <button
            :class="currentAction === 'reject' ? 'btn-2-red' : 'btn-2-green'"
            @click="handleConfirm"
          >
            Confirm <span class="capitalize hidden md:inline">{{ currentAction }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
