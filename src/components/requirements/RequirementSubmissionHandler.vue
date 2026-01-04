<script setup>
import { submitRequirement } from '@/services/requirement'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  requirementId: {
    type: [String, Number],
    required: true,
  },
  requirementNote: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['loading', 'success', 'error'])

const acceptedCharacterCount = ref(255)
const remainingCharacter = computed(() => {
  return acceptedCharacterCount.value - note.value.length
})

const toast = useToast()

const confirmBtnRef = ref(null)
const cancelBtnRef = ref(null)

const currentAction = ref(null)
const note = ref('')
const isUpdating = ref(false)

const isModalOpen = computed(() => currentAction.value !== null)

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

  try {
    await submitRequirement(props.requirementId, { note: note.value })
    emit('success')
    closeModal()
  } catch (err) {
    emit('error', err)
    return toast.error(err?.response?.data?.message || 'Submission failed!')
  } finally {
    emit('loading', false)
    isUpdating.value = false
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
    <div class="flex justify-center items-center">
      <button @click="openModal('accept')">
        <span class="btn-2">
          <span class="fas fa-paper-plane"></span>
          <span class="hidden md:inline">Submit Requirement</span>
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
        <h3 class="title-lg">Requirement Submission</h3>
        <div v-if="requirementNote">
          <textarea
            v-model="note"
            rows="4"
            placeholder="Note..."
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
            Confirm Submission
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
