<script setup>
import { useOvertimeStore } from '@/stores/overtime'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import TimePickerAsFloatHour from '../common/TimePickerAsFloatHour.vue'

const props = defineProps({
  overtime: Object,
  onSuccess: {
    type: Function,
    default: null,
  },
})

const overtimeStore = useOvertimeStore()

const confirmBtnRef = ref(null)
const cancelBtnRef = ref(null)

const isModalOpen = ref(false)
const approvalTime = ref(
  props.overtime.approval_overtime_hours || props.overtime.request_overtime_hours || '',
)

const handleUpdate = async () => {
  if (!approvalTime.value) {
    return alert('Please set approval time!')
  }

  await overtimeStore.updateApprovalTime(props.overtime.id, approvalTime.value)

  if (props.onSuccess) {
    await props.onSuccess()
  }

  closeModal()
}

const openModal = () => {
  isModalOpen.value = true

  focusDefaultButton()
}

const closeModal = () => {
  isModalOpen.value = false
}

function focusDefaultButton() {
  nextTick(() => {
    confirmBtnRef.value?.focus()
  })
}

function handleKeydown(e) {
  if (!isModalOpen.value) return

  if (e.key === 'ArrowLeft') {
    cancelBtnRef.value?.focus()
  } else if (e.key === 'ArrowRight') {
    confirmBtnRef.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <i @click="openModal" class="fa fa-edit cursor-pointer text-sky-600"></i>

  <!-- Single reusable modal -->
  <div v-if="isModalOpen" class="fixed inset-0 z-50 flex justify-center items-center bg-black/50">
    <div class="modal-card max-w-sm">
      <h3 class="title-lg">Update Approval Time</h3>
      <hr class="my-2" />
      <TimePickerAsFloatHour
        v-model="approvalTime"
        :minute-interval="5"
        :required="true"
        :hour-min="1"
        :hour-max="16"
      />
      <hr class="my-2" />
      <div class="flex justify-between gap-2 mt-4">
        <button
          type="button"
          ref="cancelBtnRef"
          class="btn-3 focus:ring-2 ring-offset-2"
          @click="closeModal"
        >
          Cancel
        </button>
        <button
          type="button"
          ref="confirmBtnRef"
          class="btn-2-green focus:ring-2 ring-offset-2"
          @click="handleUpdate"
        >
          Update Time
        </button>
      </div>
    </div>
  </div>
</template>
