<script setup>
import { useTaskNotificationStore } from '@/stores/task-notification'
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
  onSubmit: {
    type: Function,
    default: null,
  },
  variant: {
    type: Number,
    default: 1,
  },
})

const emit = defineEmits(['loading'])

const acceptedCharacterCount = ref(255)
const remainingCharacter = computed(() => {
  return acceptedCharacterCount.value - note.value.length
})

const toast = useToast()

const notificationStore = useTaskNotificationStore()

const confirmBtnRef = ref(null)
const cancelBtnRef = ref(null)

const currentAction = ref(null)
const note = ref('')
const isUpdating = ref(false)

const isModalOpen = computed(() => currentAction.value !== null)

const modalTitle = computed(() =>
  currentAction.value === 'accept' ? 'Accept Application' : 'Reject Application',
)

function openModal(action) {
  if (action === 'accept' || action === 'reject') {
    currentAction.value = action
    note.value = ''
    focusDefaultButton()
  }
}

function closeModal() {
  currentAction.value = null
  note.value = ''
}

async function handleConfirm() {
  if (notificationStore.loading) {
    return
  }

  if (currentAction.value === 'reject' && !note.value) {
    return toast.error('Rejection Reason is required!')
  }

  if (typeof props.onSubmit == 'function') {
    return props.onSubmit({
      note: note.value,
      action: currentAction.value,
    })
  }

  emit('loading', true)
  isUpdating.value = true
  await notificationStore.updateNotification(
    props.notificationType,
    props.applicationId,
    currentAction.value,
    note.value,
  )

  emit('loading', false)
  isUpdating.value = false

  if (typeof props.onSuccess == 'function') {
    props.onSuccess()
  } else {
    notificationStore.fetchTaskNotification()
  }

  closeModal()
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
        <div>
          <textarea
            v-model="note"
            rows="7"
            :placeholder="currentAction === 'accept' ? 'Accept Note...' : 'Rejection Reason...'"
            class="w-full border rounded-lg p-2 text-gray-700"
            :required="currentAction === 'reject'"
            @input="
              note.length > acceptedCharacterCount
                ? (note = note.slice(0, acceptedCharacterCount))
                : null
            "
          ></textarea>
          <div class="flex">
            <div
              class="ml-auto inline-block text-sm text-gray-500"
              :class="note.length >= acceptedCharacterCount ? 'text-red-500' : ''"
            >
              left {{ remainingCharacter }}/{{ acceptedCharacterCount }} words
            </div>
          </div>
        </div>
        <div class="flex justify-between gap-2 mt-4">
          <button
            ref="cancelBtnRef"
            class="btn-3 focus:ring-2 ring-offset-2 disabled:opacity-30"
            @click="closeModal"
            :disabled="isUpdating"
          >
            Cancel
          </button>
          <button
            ref="confirmBtnRef"
            class="focus:ring-2 ring-offset-2 disabled:opacity-30"
            :class="currentAction === 'reject' ? 'btn-2-red' : 'btn-2-green'"
            @click="handleConfirm"
            :disabled="isUpdating"
          >
            Confirm <span class="capitalize hidden md:inline">{{ currentAction }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
