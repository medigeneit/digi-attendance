<script setup>
import { onBeforeUnmount, watch } from 'vue'
import ProfileMonthlyPayslip from '@/components/profile/ProfileMonthlyPayslip.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  user: { type: Object, default: () => ({}) },
  payrolls: { type: Array, default: () => [] },
  meals: { type: Array, default: () => [] },
  loans: { type: Array, default: () => [] },
  selectedMonth: { type: String, default: '' },
})
const emit = defineEmits(['update:open'])

const close = () => emit('update:open', false)
const stop = (event) => event.stopPropagation()

const onEsc = (event) => {
  if (event.key === 'Escape') close()
}

const lockBodyScroll = (lock = true) => {
  document.body.style.overflow = lock ? 'hidden' : ''
}

watch(
  () => props.open,
  (isOpen) => {
    lockBodyScroll(isOpen)
    if (isOpen) window.addEventListener('keydown', onEsc)
    else window.removeEventListener('keydown', onEsc)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  lockBodyScroll(false)
  window.removeEventListener('keydown', onEsc)
})

const printSheet = () => window.print()
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[1050] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 print:static print:block print:overflow-visible print:bg-white print:p-0"
        @click="close"
      >
        <div
          class="salary-sheet-printable relative w-full max-w-4xl rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 print:rounded-none print:border-0 print:shadow-none"
          role="dialog"
          aria-modal="true"
          @click.stop="stop"
        >
          <div class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 print:hidden">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500 dark:text-slate-400">Salary Sheet</p>
              <h2 class="text-lg font-semibold text-stone-900 dark:text-white">Monthly Salary Sheet</h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn-1 flex items-center gap-2 border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                @click.stop="printSheet"
              >
                <i class="far fa-print text-sm"></i>
                Print
              </button>
              <button
                type="button"
                class="btn-2 flex items-center gap-2 bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 print:hidden"
                @click="close"
              >
                <i class="far fa-times"></i>
                Close
              </button>
            </div>
          </div>

          <ProfileMonthlyPayslip
            class="print:bg-white"
            :user="user"
            :payrolls="payrolls"
            :meals="meals"
            :loans="loans"
            :selected-month="selectedMonth"
          />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media print {
  .btn-1,
  .btn-2 {
    display: none;
  }
}
</style>

<style>
@media print {
  @page {
    size: A4;
    margin: 12mm;
  }

  body * {
    visibility: hidden !important;
  }

  .salary-sheet-printable,
  .salary-sheet-printable * {
    visibility: visible !important;
  }

  .salary-sheet-printable {
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    box-shadow: none !important;
    background: #fff !important;
  }
}
</style>
