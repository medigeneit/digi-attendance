<script setup>
import { usePaycutStore } from '@/stores/paycut'
import { ref, computed, watch } from 'vue'
import TimePickerAsFloatHour from '../common/TimePickerAsFloatHour.vue'
import { useToast } from 'vue-toastification'
const toast = useToast()

const props = defineProps({
  userId: {
    type: [String, Number],
    required: true,
  },
  month: {
    type: String, // format: 'YYYY-MM'
    required: true,
  },
  show: Boolean // new prop
})
const emit = defineEmits(['updated'])
const isValid = computed(() => paycutHour.value > 0 && paycutHour.value <= 24)
const payCutStore = usePaycutStore()

const isModalOpen = ref(false)
const paycutHour = ref('')
const reason = ref('')
const note = ref('')
const currentPaycut = ref(null)

const isEditMode = computed(() => !!currentPaycut.value?.id)

const fetchPaycutData = async () => {
  try {
    await payCutStore.fetchUserMonthlyPaycuts(props.userId, props.month)
    const record = payCutStore.paycut;
    currentPaycut.value = record || null
    paycutHour.value = Number(record?.paycut_hours || 0) || 0
    reason.value = record?.reason || ''
    console.log({record});
    
  } catch (err) {
    console.error('Failed to fetch paycut:', err)
    currentPaycut.value = null
    paycutHour.value = ''
    reason.value = ''
  }
}

// Fetch when modal opens
watch(isModalOpen, async (val) => {
  if (val) {
    await fetchPaycutData()
  }
})

// Fetch on userId or month change
watch(
  () => [props.userId, props.month],
  async () => {
    if (isModalOpen.value) {
      await fetchPaycutData()
    }
  }
)

const handleSubmit = async () => {

  if (!isValid.value) return toast.error('Paycut hour must be between 1–24')

  const confirmed = window.confirm(
    isEditMode.value
      ? 'Are you sure you want to update this paycut? This can only be done once.'
      : 'Are you sure you want to create this paycut?'
  );
  if (!confirmed) return

  try {
    if (isEditMode.value) {
      await payCutStore.updatePaycut(currentPaycut.value.id, {
        paycut_hours: paycutHour.value,
        note: note.value,
      })
    } else {
      await payCutStore.createPaycut({
        paycut_hours: paycutHour.value,
        reason: reason.value,
        user_id: props.userId,
        month: props.month,
      })
    }
    emit('updated')  // notify parent
    closeModal()
  } catch (e) {
    alert('Failed to submit paycut: ' + e.message)
  }
}

const closeModal = () => {
  isModalOpen.value = false
}
</script>


<template>
  <i @click="isModalOpen = true" class="fa fa-edit cursor-pointer text-sky-600"></i>
  <div v-if="isModalOpen" class="fixed inset-0 z-50 flex justify-center items-center bg-black/50">
    <div class="modal-card max-w-sm">
      <h3 class="title-lg">{{ isEditMode ? 'Update Paycut' : 'Create Paycut' }}</h3>
      <hr class="my-2" />
      <TimePickerAsFloatHour
        v-model="paycutHour"
        :minute-interval="5"
        :required="true"
        :hour-min="1"
        :hour-max="24"
      />
      <div v-if="isEditMode">
        <textarea
          class="input-1"
          v-model="note"
          placeholder="Edit Note"
        ></textarea>
      </div> 
      <div v-else>
        <textarea
          class="input-1"
          v-model="reason"
          placeholder="Pay cut reason"
        ></textarea>
      </div>
      <hr class="my-2" />
      <div class="flex justify-between gap-2 mt-4">
        <button class="btn-3" @click="closeModal">Cancel</button>
        <button class="btn-2-green" @click="handleSubmit">
          {{ isEditMode ? 'Update' : 'Create' }}
        </button>
      </div>
    </div>
  </div>
</template>
