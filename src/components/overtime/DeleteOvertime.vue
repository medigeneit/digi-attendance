<script setup>
import { useOvertimeStore } from '@/stores/overtime'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import DisplayFormattedWorkingHours from './DisplayFormattedWorkingHours.vue'

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

const handleDelete = async () => {
  await overtimeStore.deleteOvertime(props.overtime.id)

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
  <i @click="openModal" class="fa fa-trash cursor-pointer text-red-600"></i>

  <!-- Single reusable modal -->
  <div v-if="isModalOpen" class="fixed inset-0 z-50 flex justify-center items-center bg-black/50">
    <div class="modal-card max-w-sm p-4">
      <h3 class="title-lg">Delete Overtime</h3>
      <div class="grid grid-cols-3 gap-2 border p-3">
        <div>
          <b>{{
            new Date(overtime.date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
          }}</b>
        </div>
        <div class="border-x">
          <b>{{ overtime.duty_type }}</b>
        </div>
        <div>
          <b>
            <DisplayFormattedWorkingHours :workingHours="overtime.request_overtime_hours" />
          </b>
        </div>
        <div class="col-span-full text-xs md:text-sm border-t pt-3">
          {{ overtime.work_details }}
        </div>
      </div>
      <div class="flex justify-between gap-2 mt-2">
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
          class="btn-2-red focus:ring-2 ring-offset-2"
          @click="handleDelete"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
