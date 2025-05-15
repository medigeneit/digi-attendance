<script setup>
import { useNotificationStore } from '@/stores/notification'
import { computed, ref } from 'vue'

const props = defineProps({
  notificationType: {
    type: String,
    required: true,
  },
  applicationId: {
    type: [String, Number],
    required: true,
  },
})

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
  await notificationStore.updateSpecificNotification(
    props.notificationType,
    props.applicationId,
    currentAction.value,
    note.value,
  )

  closeModal()
}
</script>

<template>
  <div>
    <div class="flex gap-3">
      <button @click="openModal('accept')" class="btn-2">Approve</button>
      <button @click="openModal('reject')" class="btn-1">Reject</button>
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
          :placeholder="`Enter ${currentAction === 'accept' ? 'accept' : 'rejection'} note...`"
          class="w-full border rounded-lg p-2 text-gray-700"
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
