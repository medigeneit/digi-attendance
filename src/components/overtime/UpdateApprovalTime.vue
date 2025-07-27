<script setup>
import { useOvertimeStore } from '@/stores/overtime'
import { ref } from 'vue'
import TimePickerAsFloatHour from '../common/TimePickerAsFloatHour.vue'

const props = defineProps({
  overtime: Object,
  onSuccess: {
    type: Function,
    default: null,
  },
})

const overtimeStore = useOvertimeStore()

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

const closeModal = () => {
  isModalOpen.value = false
}
</script>

<template>
  <i @click="isModalOpen = !isModalOpen" class="fa fa-edit cursor-pointer text-sky-600"></i>

  <!-- Single reusable modal -->
  <div v-if="isModalOpen" class="fixed inset-0 z-50 flex justify-center items-center bg-black/50">
    <div class="modal-card max-w-sm">
      <h3 class="title-lg">Update Approval Time</h3>
      <hr class="my-2" />
      <TimePickerAsFloatHour
        v-model="approvalTime"
        :minute-interval="5"
        :required="true"
        :hour-min="2"
        :hour-max="16"
      />
      <hr class="my-2" />
      <div class="flex justify-between gap-2 mt-4">
        <button class="btn-3" @click="closeModal">Cancel</button>
        <button class="btn-2-green" @click="handleUpdate">Update Time</button>
      </div>
    </div>
  </div>
</template>
