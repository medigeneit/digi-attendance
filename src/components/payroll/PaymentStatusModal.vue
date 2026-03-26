<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  payrollId: { type: [Number, String], default: null },
  currentStatus: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit'])

const form = ref({
  payment_status: '',
  payment_method: '',
  remarks: '',
})

const submitting = ref(false)

watch(
  () => props.show,
  (val) => {
    if (val) {
      form.value = { payment_status: props.currentStatus || '', payment_method: '', remarks: '' }
    }
  },
)

const handleSubmit = () => {
  if (!form.value.payment_status) return
  emit('submit', { id: props.payrollId, payload: { ...form.value } })
}
</script>

<template>
  <teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h3 class="font-bold text-blue-900 text-lg">Update Payment Status</h3>
          <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Payment Status <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.payment_status"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select status</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="hold">Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              v-model="form.payment_method"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select method</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="mobile_banking">Mobile Banking</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              v-model="form.remarks"
              rows="3"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Optional remarks..."
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="btn-3" @click="emit('close')">Cancel</button>
            <button type="submit" class="btn-2" :disabled="!form.payment_status || submitting">
              <i class="far fa-save"></i>
              {{ submitting ? 'Saving...' : 'Update Status' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </teleport>
</template>
