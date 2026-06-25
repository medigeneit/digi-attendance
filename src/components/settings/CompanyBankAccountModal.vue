<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  saving: { type: Boolean, default: false },
  bankAccount: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const isEditMode = ref(false)
const form = reactive({
  id: null,
  bank_name: '',
  branch_name: '',
  account_name: '',
  account_number: '',
  routing_number: '',
  swift_code: '',
  currency_code: 'BDT',
  account_type: '',
  status: 'Active',
  notes: '',
})

const resetForm = () => {
  isEditMode.value = false
  form.id = null
  form.bank_name = ''
  form.branch_name = ''
  form.account_name = ''
  form.account_number = ''
  form.routing_number = ''
  form.swift_code = ''
  form.currency_code = 'BDT'
  form.account_type = ''
  form.status = 'Active'
  form.notes = ''
}

watch(
  () => props.bankAccount,
  (value) => {
    if (value && typeof value === 'object' && Object.keys(value).length) {
      isEditMode.value = true
      form.id = value.id ?? null
      form.bank_name = value.bank_name ?? ''
      form.branch_name = value.branch_name ?? ''
      form.account_name = value.account_name ?? ''
      form.account_number = value.account_number ?? ''
      form.routing_number = value.routing_number ?? ''
      form.swift_code = value.swift_code ?? ''
      form.currency_code = value.currency_code ?? 'BDT'
      form.account_type = value.account_type ?? ''
      form.status = value.status ?? 'Active'
      form.notes = value.notes ?? ''
    } else {
      resetForm()
    }
  },
  { immediate: true, deep: true },
)

const closeModal = () => emit('close')

const handleSubmit = () => {
  emit('save', { ...form })
  closeModal()
}
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <div class="mb-4 flex items-start justify-between gap-3">
        <h2 class="text-lg font-semibold">
          {{ isEditMode ? 'Edit Bank Account' : 'Add Bank Account' }}
        </h2>
        <button type="button" class="text-slate-500 hover:text-slate-700" @click="closeModal" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Bank Name <span class="text-rose-600">*</span></label>
            <input v-model="form.bank_name" type="text" class="input-light" required :disabled="saving" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Branch Name</label>
            <input v-model="form.branch_name" type="text" class="input-light" :disabled="saving" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Account Name</label>
            <input v-model="form.account_name" type="text" class="input-light" :disabled="saving" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Account Number <span class="text-rose-600">*</span></label>
            <input v-model="form.account_number" type="text" class="input-light" required :disabled="saving" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Routing Number</label>
            <input v-model="form.routing_number" type="text" class="input-light" :disabled="saving" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">SWIFT Code</label>
            <input v-model="form.swift_code" type="text" class="input-light" :disabled="saving" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Currency</label>
            <input v-model="form.currency_code" type="text" class="input-light" maxlength="3" :disabled="saving" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Account Type</label>
            <input
              v-model="form.account_type"
              type="text"
              class="input-light"
              placeholder="Current / Savings"
              :disabled="saving"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Status</label>
            <select v-model="form.status" class="input-light" required :disabled="saving">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Notes</label>
          <textarea v-model="form.notes" class="input-light" rows="3" :disabled="saving"></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" @click="closeModal" class="btn-3" :disabled="saving">
            Cancel
          </button>
          <button type="submit" class="btn-2" :disabled="saving">
            <span v-if="saving">Saving...</span>
            <span v-else>{{ isEditMode ? 'Update' : 'Create' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
