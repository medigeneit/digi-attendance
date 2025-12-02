<script setup>
import { usePaycutStore } from '@/stores/paycut'
import { computed, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import TimePickerAsFloatHour from '../common/TimePickerAsFloatHour.vue'

const toast = useToast()

const minimumPayCutHour = ref(0)
const maximumPayCutHour = ref(54)

const props = defineProps({
  userId: {
    type: [String, Number],
    required: true,
  },
  month: {
    type: String, // format: 'YYYY-MM'
    required: true,
  },
  show: Boolean, // new prop
})

const emit = defineEmits(['updated'])

const isValid = computed(
  () => paycutHour.value >= minimumPayCutHour.value && paycutHour.value <= maximumPayCutHour.value,
)

const payCutStore = usePaycutStore()

const isModalOpen = ref(false)
const isSubmitting = ref(false)
const paycutHour = ref('')
const reason = ref('')
const note = ref('')
const currentPaycut = ref(null)

const isEditMode = computed(() => !!currentPaycut.value?.id)
const modalTitle = computed(() => (isEditMode.value ? 'Update Paycut' : 'Create Paycut'))
const ctaLabel = computed(() => (isEditMode.value ? 'Save changes' : 'Create paycut'))
const canSubmit = computed(() => isValid.value && paycutHour.value !== '')
const monthLabel = computed(() => {
  if (!props.month) return ''
  const [year, month] = props.month.split('-')
  if (!year || !month) return props.month
  const formatted = new Date(Number(year), Number(month) - 1)
  return formatted.toLocaleString('en', { month: 'long', year: 'numeric' })
})
const rangeHint = computed(
  () => `Allowed: ${minimumPayCutHour.value}h - ${maximumPayCutHour.value}h per cycle`,
)

const fetchPaycutData = async () => {
  try {
    await payCutStore.fetchUserMonthlyPaycuts(props.userId, props.month)
    const record = payCutStore.paycut
    currentPaycut.value = record || null
    paycutHour.value = Number(record?.paycut_hours || 0) || 0
    reason.value = record?.reason || ''
    note.value = record?.note || ''
    console.log({ record })
  } catch (err) {
    console.error('Failed to fetch paycut:', err)
    currentPaycut.value = null
    paycutHour.value = ''
    reason.value = ''
    note.value = ''
  }
}

// Fetch on userId or month change
watch(
  () => [props.userId, props.month],
  async () => {
    if (isModalOpen.value) {
      await fetchPaycutData()
    }
  },
)

const handleSubmit = async () => {
  if (!isValid.value) {
    return toast.error(
      `Paycut hour must be between ${minimumPayCutHour.value} and ${maximumPayCutHour.value}`,
    )
  }

  const confirmed = window.confirm(
    isEditMode.value
      ? 'Are you sure you want to update this paycut? This can only be done once.'
      : 'Are you sure you want to create this paycut?',
  )
  if (!confirmed) return

  try {
    isSubmitting.value = true
    if (isEditMode.value) {
      await payCutStore.updatePaycut(currentPaycut.value.id, {
        paycut_hours: paycutHour.value,
        reason: reason.value,
        note: note.value,
      })
    } else {
      await payCutStore.createPaycut({
        paycut_hours: paycutHour.value,
        reason: reason.value,
        note: note.value,
        user_id: props.userId,
        month: props.month,
      })
    }
    emit('updated') // notify parent
    closeModal()
  } catch (e) {
    alert('Failed to submit paycut: ' + e.message)
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  isModalOpen.value = false
}

const openModal = async () => {
  isModalOpen.value = true
  await fetchPaycutData()
}
</script>

<template>
  <button type="button" class="paycut-trigger" @click="openModal" title="Adjust paycut hours">
    <i class="far fa-edit"></i>
  </button>

  <transition name="fade-scale">
    <div
      v-if="isModalOpen"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paycut-modal-title"
      @keydown.esc="closeModal"
      @click.self="closeModal"
    >
      <div class="modal-card max-w-lg">
        <header class="modal-card__head">
          <div class="icon-circle">
            <i class="fal fa-wallet"></i>
          </div>
          <div>
            <p id="paycut-modal-title" class="modal-card__title">{{ modalTitle }}</p>
            <p class="modal-card__subtitle">
              {{ isEditMode ? 'Adjust existing deduction for this period.' : 'Create a one-off deduction.' }}
            </p>
          </div>
          <button class="icon-button" type="button" @click="closeModal">
            <i class="far fa-times"></i>
          </button>
        </header>

        <section class="modal-card__meta">
          <div>
            <p class="meta-label">Month</p>
            <p class="meta-value">{{ monthLabel }}</p>
          </div>
          <div>
            <p class="meta-label">User ID</p>
            <p class="meta-value">#{{ props.userId }}</p>
          </div>
          <div>
            <p class="meta-label">Status</p>
            <span
              class="status-badge"
              :class="isEditMode ? 'status-badge--warn' : 'status-badge--fresh'"
            >
              {{ isEditMode ? 'Existing' : 'New' }}
            </span>
          </div>
        </section>

        <section class="modal-card__body">
          <div class="field-control flex flex-col gap-2">
            <label class="field-label">Paycut hours</label>
            <TimePickerAsFloatHour
              v-model="paycutHour"
              :minute-interval="5"
              :required="true"
              :hour-min="minimumPayCutHour"
              :hour-max="maximumPayCutHour"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label class="field-label">Reason</label>
            <textarea
              class="input-1"
              rows="3"
              v-model="reason"
              placeholder="Share context that explains the deduction..."
            ></textarea>
          </div>          
        </section>

        <footer class="modal-card__footer">
          <div class="footer-status">
            <i class="fal fa-info-circle"></i>
            <span>
              {{
                canSubmit
                  ? 'Double-check before saving - this impacts payout immediately.'
                  : 'Fill the required fields to continue.'
              }}
            </span>
          </div>
          <div class="modal-card__actions">
            <button class="btn-3" type="button" @click="closeModal">Cancel</button>
            <button
              class="btn-2-green"
              type="button"
              :disabled="!canSubmit || isSubmitting"
              :aria-busy="isSubmitting"
              @click="handleSubmit"
            >
              <span v-if="isSubmitting" class="loading-dots">Saving...</span>
              <span v-else>{{ ctaLabel }}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.paycut-trigger {
  @apply inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50;
}
.modal-overlay {
  @apply fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-3;
}
.modal-card {
  @apply w-full rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl transition;
}
.modal-card__head {
  @apply relative flex items-start gap-4 border-b border-slate-100 pb-4;
}
.icon-circle {
  @apply flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 text-xl;
}
.icon-button {
  @apply absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600;
}
.modal-card__title {
  @apply text-lg font-semibold text-slate-900;
}
.modal-card__subtitle {
  @apply text-sm text-slate-500;
}
.modal-card__meta {
  @apply mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm;
}
.meta-label {
  @apply text-[11px] uppercase tracking-wide text-slate-400;
}
.meta-value {
  @apply font-medium text-slate-800;
}
.status-badge {
  @apply inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide;
}
.status-badge--warn {
  @apply bg-amber-100 text-amber-700;
}
.status-badge--fresh {
  @apply bg-emerald-100 text-emerald-700;
}
.modal-card__body {
  @apply mt-5 space-y-3;
}
.field-label {
  @apply text-xs text-start font-semibold uppercase tracking-wide text-slate-500;
}
.field-control {
  @apply space-y-1;
}

.modal-card__footer {
  @apply mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4;
}
.footer-status {
  @apply inline-flex items-center gap-2 text-xs text-slate-500;
}
.modal-card__actions {
  @apply flex items-center justify-end gap-2;
}
.btn-2-green:disabled {
  @apply opacity-60;
}
.loading-dots {
  @apply inline-flex items-center gap-1;
}
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
