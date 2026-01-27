<script setup>
import { usePayrollStore } from '@/stores/payroll'
import { computed, ref, watch, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import TimePickerAsFloatHour from '../common/TimePickerAsFloatHour.vue'

const toast = useToast()
const payrollStore = usePayrollStore()

const minHour = ref(0)
const maxHour = ref(279)

const props = defineProps({
  userId: { type: [String, Number], required: true },
  month: { type: String, required: true }, // YYYY-MM
  employeeName: { type: String, default: '' },
})

const emit = defineEmits(['updated'])

const isModalOpen = ref(false)
const isSubmitting = ref(false)
const isTogglingLock = ref(false)
const isLoading = ref(false)
const loadError = ref('')

const payableHour = ref('')
const note = ref('')
const currentPeriod = ref(null)

// keep a snapshot to detect unsaved changes
const snapshot = ref({ payable_hour: 0, note: '' })

const monthLabel = computed(() => {
  if (!props.month) return ''
  const [y, m] = props.month.split('-')
  const d = new Date(Number(y), Number(m) - 1)
  return d.toLocaleString('en', { month: 'long', year: 'numeric' })
})

const statusValue = computed(() => String(currentPeriod.value?.status || 'draft'))
const isLocked = computed(
  () =>
    statusValue.value === 'locked' ||
    Boolean(currentPeriod.value?.locked_at) ||
    Boolean(currentPeriod.value?.is_locked)
)

const statusLabel = computed(() => (isLocked.value ? 'Locked' : 'Draft'))

const lockedAtLabel = computed(() => {
  if (!currentPeriod.value?.locked_at) return ''
  try {
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(currentPeriod.value.locked_at))
  } catch {
    return String(currentPeriod.value.locked_at)
  }
})

const hourNumber = computed(() => Number(payableHour.value))
const isValid = computed(() => {
  const v = hourNumber.value
  return Number.isFinite(v) && v >= minHour.value && v <= maxHour.value
})

const rangeHint = computed(() => `Allowed: ${minHour.value}h – ${maxHour.value}h per cycle`)
const validationHint = computed(() => {
  if (payableHour.value === '') return ''
  return isValid.value ? '' : `Payable hours must be between ${minHour.value} and ${maxHour.value}.`
})

const isDirty = computed(() => {
  const p = Number(snapshot.value?.payable_hour ?? 0)
  const n = String(snapshot.value?.note ?? '')
  return Number(hourNumber.value) !== p || String(note.value || '') !== n
})

const canSubmit = computed(() => isDirty.value && isValid.value && !isLocked.value && !isSubmitting.value)

const setSnapshotFromForm = () => {
  snapshot.value = {
    payable_hour: Number(payableHour.value || 0),
    note: String(note.value || ''),
  }
}

const resetToSnapshot = () => {
  payableHour.value = Number(snapshot.value?.payable_hour ?? 0)
  note.value = String(snapshot.value?.note ?? '')
}

const loadData = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    const p = await payrollStore.fetchUserPeriod(props.userId, props.month)
    currentPeriod.value = p || null

    payableHour.value = Number(currentPeriod.value?.payable_hour ?? 0)
    note.value = currentPeriod.value?.note || ''

    setSnapshotFromForm()
  } catch (err) {
    console.error(err)
    loadError.value = err?.message || 'Failed to load payroll period'
    toast.error(loadError.value)
    currentPeriod.value = null
    payableHour.value = 0
    note.value = ''
    setSnapshotFromForm()
  } finally {
    isLoading.value = false
  }
}

const openModal = async () => {
  isModalOpen.value = true
  await nextTick()
  await loadData()
}

const closeModal = () => {
  isModalOpen.value = false
}

watch(
  () => [props.userId, props.month],
  async () => {
    if (isModalOpen.value) await loadData()
  }
)

const toggleLock = async () => {
  if (!currentPeriod.value?.id) {
    toast.info('Save once to create the period, then you can lock/unlock.')
    return
  }

  if (isDirty.value && !isLocked.value) {
    const ok = window.confirm('You have unsaved changes. Continue without saving?')
    if (!ok) return
    resetToSnapshot()
  }

  try {
    isTogglingLock.value = true
    const res = isLocked.value
      ? await payrollStore.unlockPeriod(currentPeriod.value.id)
      : await payrollStore.lockPeriod(currentPeriod.value.id)

    const updated = res?.period || res?.data || res
    currentPeriod.value = updated || currentPeriod.value
    emit('updated', { period: currentPeriod.value, userId: props.userId })

    toast.success(isLocked.value ? 'Unlocked.' : 'Locked.')
  } catch (e) {
    toast.error(e?.message || 'Failed to change status')
  } finally {
    isTogglingLock.value = false
  }
}

const handleSubmit = async () => {
  if (!isValid.value) return toast.error(validationHint.value || 'Invalid payable hours.')
  if (isLocked.value) return toast.error('This payroll period is locked.')

  try {
    isSubmitting.value = true

    const payload = {
      user_id: props.userId,
      month: props.month, // YYYY-MM
      payable_hour: Number(payableHour.value),
      note: String(note.value || '').trim() || null,
    }

    const res = await payrollStore.upsertPeriod(payload)
    const updated = res?.period || res?.data || res
    currentPeriod.value = updated || currentPeriod.value

    // update snapshot after save
    setSnapshotFromForm()
    emit('updated', { period: currentPeriod.value, userId: props.userId })

    toast.success('Saved.')
    closeModal()
  } catch (e) {
    toast.error(e?.message || 'Failed to save payroll period')
  } finally {
    isSubmitting.value = false
  }
}
</script>
<template>
  <button type="button" class="paycut-trigger" @click="openModal" title="Adjust payable hours">
    <i class="far fa-edit"></i>
  </button>

  <transition name="fade-scale">
    <div
      v-if="isModalOpen"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addon-modal-title"
      @keydown.esc="closeModal"
      @click.self="closeModal"
    >
      <div class="modal-card max-w-lg">
        <header class="modal-card__head">
          <div class="icon-circle">
            <i class="fal fa-clock"></i>
          </div>

          <div class="min-w-0">
            <p id="addon-modal-title" class="modal-card__title">Payroll Period</p>
            <p class="modal-card__subtitle">
              Set payable hours & notes. Lock to prevent edits.
            </p>
          </div>

          <!-- status chip (top-right, subtle) -->
          <div class="status-chip" :class="isLocked ? 'status-chip--locked' : 'status-chip--draft'">
            <i :class="isLocked ? 'far fa-lock' : 'far fa-pen'"></i>
            <span>{{ statusLabel }}</span>
          </div>

          <!-- lock/unlock -->
          <button
            class="icon-button icon-button--lock"
            type="button"
            :disabled="isTogglingLock || isLoading"
            :title="isLocked ? 'Unlock period' : 'Lock period'"
            :aria-busy="isTogglingLock"
            @click="toggleLock"
          >
            <i
              :class="
                isTogglingLock
                  ? 'far fa-spinner-third fa-spin'
                  : isLocked
                    ? 'far fa-lock-open'
                    : 'far fa-lock'
              "
            ></i>
          </button>

          <button class="icon-button" type="button" aria-label="Close" @click="closeModal">
            <i class="far fa-times"></i>
          </button>
        </header>

        <!-- Error banner -->
        <div v-if="loadError" class="inline-alert inline-alert--error">
          <i class="far fa-triangle-exclamation"></i>
          <div class="min-w-0">
            <p class="font-semibold">Couldn’t load period</p>
            <p class="text-xs opacity-80 truncate">{{ loadError }}</p>
          </div>
          <button class="inline-alert__action" type="button" @click="loadData">Retry</button>
        </div>

        <section class="modal-card__meta">
          <div>
            <p class="meta-label">Month</p>
            <p class="meta-value">{{ monthLabel }}</p>
          </div>
          <div>
            <p class="meta-label">Employee</p>
            <p class="meta-value truncate">{{ props.employeeName || '-' }}</p>
          </div>
          <div>
            <p class="meta-label">User</p>
            <p class="meta-value">#{{ props.userId }}</p>
          </div>
          <div v-if="isLocked">
            <p class="meta-label">Locked at</p>
            <p class="meta-value">{{ lockedAtLabel || '-' }}</p>
          </div>
        </section>

        <section class="modal-card__body">
          <div v-if="isLoading" class="skeleton">
            <div class="skeleton-line w-2/3"></div>
            <div class="skeleton-box"></div>
            <div class="skeleton-line w-1/2"></div>
            <div class="skeleton-box h-20"></div>
          </div>

          <template v-else>
            <div class="field-control flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <label class="field-label">Payable hours</label>
                <span class="text-[11px] text-slate-400">{{ rangeHint }}</span>
              </div>

              <TimePickerAsFloatHour
                v-model="payableHour"
                :minute-interval="5"
                :required="true"
                :hour-min="minHour"
                :hour-max="maxHour"
                :disabled="isLocked"
              />

              <p v-if="validationHint" class="text-xs text-rose-600">
                {{ validationHint }}
              </p>
              <p v-else-if="isLocked" class="text-xs text-amber-600">
                This period is locked — unlock to edit.
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <label class="field-label">Note</label>
                <span class="text-[11px] text-slate-400">{{ (note || '').length }}/1000</span>
              </div>

              <textarea
                class="input-1"
                rows="3"
                v-model="note"
                :disabled="isLocked"
                placeholder="Optional: explain changes…"
              ></textarea>
            </div>
          </template>
        </section>

        <footer class="modal-card__footer">
          <div class="footer-status">
            <i class="fal fa-info-circle"></i>
            <span>
              {{
                isLocked
                  ? 'Locked: no edits allowed.'
                  : isDirty
                    ? 'You have unsaved changes.'
                    : 'No changes yet.'
              }}
            </span>
          </div>

          <div class="modal-card__actions">
            <button class="btn-3" type="button" @click="closeModal">Close</button>

            <button
              v-if="!isLocked"
              class="btn-3"
              type="button"
              :disabled="!isDirty || isSubmitting"
              @click="resetToSnapshot"
              title="Reset changes"
            >
              Reset
            </button>

            <button
              class="btn-2-green"
              type="button"
              :disabled="!canSubmit"
              :aria-busy="isSubmitting"
              @click="handleSubmit"
            >
              <span v-if="isSubmitting" class="loading-dots">Saving...</span>
              <span v-else>{{ isDirty ? 'Save changes' : 'Saved' }}</span>
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

.icon-button--lock {
  @apply right-10;
}

.modal-card__title {
  @apply text-lg font-semibold text-slate-900;
}

.modal-card__subtitle {
  @apply text-sm text-slate-500;
}

/* ✅ Status chip in header */
.status-chip {
  @apply absolute right-20 top-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide;
}
.status-chip--draft {
  @apply bg-emerald-50 text-emerald-700;
}
.status-chip--locked {
  @apply bg-amber-50 text-amber-700;
}

/* ✅ Responsive meta */
.modal-card__meta {
  @apply mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm;
}
@media (min-width: 640px) {
  .modal-card__meta {
    @apply grid-cols-4;
  }
}

.meta-label {
  @apply text-[11px] uppercase tracking-wide text-slate-400;
}
.meta-value {
  @apply font-medium text-slate-800;
}

.modal-card__body {
  @apply mt-5 space-y-4;
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

/* ✅ Inline alert */
.inline-alert {
  @apply mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm;
}
.inline-alert--error {
  @apply border-rose-100 bg-rose-50 text-rose-800;
}
.inline-alert__action {
  @apply ml-auto rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100;
}

/* ✅ Skeleton loader */
.skeleton {
  @apply space-y-3;
}
.skeleton-line {
  @apply h-3 rounded-full bg-slate-100;
}
.skeleton-box {
  @apply h-12 rounded-2xl bg-slate-100;
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
