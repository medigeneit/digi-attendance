<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  open: { type: Boolean, default: false },
  loan: { type: Object, default: null },
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

const formatMonth = (value) => {
  if (!value) return '-'
  const padded = /^\d{4}-\d{2}$/i.test(value) ? `${value}-01` : value
  const date = new Date(padded)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date)
}

const toTimestamp = (value) => {
  if (!value) return 0
  const padded = /^\d{4}-\d{2}$/i.test(value) ? `${value}-01` : value
  const date = new Date(padded)
  if (Number.isNaN(date.getTime())) return 0
  return date.getTime()
}

const sortOrder = ref('desc')
const sortedInstallments = computed(() => {
  const list = Array.isArray(props.loan?.installments) ? [...props.loan.installments] : []
  const direction = sortOrder.value === 'asc' ? 1 : -1
  return list.sort((a, b) => direction * (toTimestamp(a.salary_month) - toTimestamp(b.salary_month)))
})

const sortLabel = computed(() => (sortOrder.value === 'asc' ? 'Oldest first' : 'Newest first'))

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

const sortIcon = computed(() => (sortOrder.value === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'))
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[1050] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6"
        @click="close"
      >
        <div
          class="relative w-full max-w-3xl rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 print:border print:border-black print:shadow-none print:rounded-none"
          role="dialog"
          aria-modal="true"
          @click.stop="stop"
        >
          <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500 dark:text-slate-400">Loan Installments</p>
              <h2 class="text-lg font-semibold text-stone-900 dark:text-white">
                {{ props.loan?.loan_title || 'Loan' }} Installments 
              </h2>
            </div>
            <button
              type="button"
              class="btn-3 flex items-center gap-2 border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              @click="close"
            >
              <i class="far fa-times"></i>
              Close
            </button>
          </div>

          <div v-if="!props.loan" class="px-5 py-10 text-center text-sm text-stone-500">
            Loan details are unavailable.
          </div>

          <div v-else class="space-y-4 px-5 py-6">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p class="text-xs uppercase tracking-[0.16em] text-stone-500">Total Amount</p>
                <p class="mt-1 text-base font-semibold text-stone-900 dark:text-white">{{ formatCurrency(props.loan.loan_amount) }}</p>
              </div>
              <div class="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p class="text-xs uppercase tracking-[0.16em] text-stone-500">Installment</p>
                <p class="mt-1 text-base font-semibold text-stone-900 dark:text-white">{{ formatCurrency(props.loan.installment_amount) }}</p>
              </div>
            </div>

            <div class="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-stone-900 dark:text-white">Installment Schedule</h3>
                  <span class="text-xs text-stone-500 dark:text-slate-400">
                    Total {{ props.loan?.total_installments || 0 }}
                  </span>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                  @click="toggleSortOrder"
                >
                  <i class="far" :class="sortIcon"></i>
                  {{ sortLabel }}
                </button>
              </div>

              <div v-if="sortedInstallments.length" class="mt-4 space-y-3">
                <div
                  v-for="installment in sortedInstallments"
                  :key="installment.id"
                  class="grid grid-cols-[minmax(0,1fr)_100px] gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-stone-900 dark:text-white">{{ formatMonth(installment.salary_month) }}</p>
                  </div>
                  <div class="text-right flex items-center justify-end gap-2">
                    <p class="text-sm font-semibold text-stone-900 dark:text-white">{{ formatCurrency(installment.amount) }}</p>
                    <p class="text-xs text-stone-500 dark:text-slate-400">{{ installment.status || 'Pending' }}</p>
                  </div>
                </div>
              </div>

              <div v-else class="mt-4 rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
                No installments recorded yet.
              </div>
            </div>
          </div>
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
</style>
