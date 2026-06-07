<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  payrollId: { type: [Number, String], default: null },
  currentStatus: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit'])

const statusOptions = [
  { value: 'pending',   label: 'Pending' },
  { value: 'paid',      label: 'Paid' },
  { value: 'partial',   label: 'Partial' },
  { value: 'unpaid',    label: 'Unpaid' },
  { value: 'hold',      label: 'Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]

const methodOptions = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash',          label: 'Cash' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'bkash',         label: 'bKash' },
  { value: 'nagad',         label: 'Nagad' },
  { value: 'rocket',        label: 'Rocket' },
  { value: 'other',         label: 'Other' },
]

const statusMeta = {
  pending:   { cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid:      { cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  partial:   { cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  unpaid:    { cls: 'bg-red-50 text-red-700 border-red-200' },
  hold:      { cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  cancelled: { cls: 'bg-red-50 text-red-700 border-red-200' },
}

const form = ref({ payment_status: '', payment_method: '', remarks: '' })
const submitting = ref(false)

watch(
  () => props.show,
  (val) => {
    if (val) {
      const s = String(props.currentStatus || '').toLowerCase()
      form.value = {
        payment_status: statusOptions.find((o) => o.value === s) ? s : '',
        payment_method: '',
        remarks: '',
      }
    }
  },
)

const selectedMeta = () => statusMeta[form.value.payment_status] || { cls: 'bg-slate-100 text-slate-500 border-slate-200' }

const handleSubmit = () => {
  if (!form.value.payment_status || submitting.value) return
  submitting.value = true
  emit('submit', { id: props.payrollId, payload: { ...form.value } })
  submitting.value = false
}
</script>

<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
        @mousedown.self="emit('close')"
      >
        <div class="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl mx-0 sm:mx-4">

          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <i class="far fa-credit-card text-sm"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800">Update Payment Status</h3>
                <p class="text-xs text-slate-400">Payroll #{{ payrollId }}</p>
              </div>
            </div>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              @click="emit('close')"
            >
              <i class="far fa-times text-sm"></i>
            </button>
          </div>

          <form class="space-y-4 p-6" @submit.prevent="handleSubmit">

            <!-- Status Select -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-slate-600">
                Payment Status <span class="text-rose-500">*</span>
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  type="button"
                  class="rounded-xl border px-2 py-2 text-xs font-semibold transition-all"
                  :class="form.payment_status === opt.value
                    ? (statusMeta[opt.value]?.cls || 'bg-indigo-50 text-indigo-700 border-indigo-300') + ' ring-2 ring-offset-1 ring-indigo-400'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'"
                  @click="form.payment_status = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Payment Method -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-slate-600">Payment Method</label>
              <select
                v-model="form.payment_method"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select method (optional)</option>
                <option v-for="m in methodOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>

            <!-- Remarks -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-slate-600">Remarks</label>
              <textarea
                v-model="form.remarks"
                rows="2"
                class="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Optional note..."
              ></textarea>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-1">
              <button type="button" class="btn-3" @click="emit('close')">Cancel</button>
              <button
                type="submit"
                class="btn-2"
                :disabled="!form.payment_status || submitting"
              >
                <i class="far fa-save"></i>
                {{ submitting ? 'Saving…' : 'Update Status' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
