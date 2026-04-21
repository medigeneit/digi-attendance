<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  saving: { type: Boolean, default: false },
  bankAccount: { type: Object, default: null },
  companies: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'save'])

const isEditMode = ref(false)
const form = reactive({
  id: null,
  company_id: '',
  bank_name: '',
  branch_name: '',
  account_name: '',
  account_number: '',
  routing_number: '',
  swift_code: '',
  currency_code: 'BDT',
  account_type: '',
  is_default: false,
  status: 'Active',
  notes: '',
})

const resetForm = () => {
  isEditMode.value = false
  form.id = null
  form.company_id = ''
  form.bank_name = ''
  form.branch_name = ''
  form.account_name = ''
  form.account_number = ''
  form.routing_number = ''
  form.swift_code = ''
  form.currency_code = 'BDT'
  form.account_type = ''
  form.is_default = false
  form.status = 'Active'
  form.notes = ''
}

watch(
  () => props.bankAccount,
  (value) => {
    if (value && typeof value === 'object' && Object.keys(value).length) {
      isEditMode.value = true
      form.id = value.id ?? null
      form.company_id = value.company_id ?? ''
      form.bank_name = value.bank_name ?? ''
      form.branch_name = value.branch_name ?? ''
      form.account_name = value.account_name ?? ''
      form.account_number = value.account_number ?? ''
      form.routing_number = value.routing_number ?? ''
      form.swift_code = value.swift_code ?? ''
      form.currency_code = value.currency_code ?? 'BDT'
      form.account_type = value.account_type ?? ''
      form.is_default = !!value.is_default
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
          {{ isEditMode ? 'Edit Company Bank Account' : 'Add Company Bank Account' }}
        </h2>
        <button type="button" class="text-slate-500 hover:text-slate-700" @click="closeModal" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Company <span class="text-rose-600">*</span></label>
          <select v-model="form.company_id" class="input-light" required :disabled="saving">
            <option value="" disabled>Select a company</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">
              {{ c.short_name ? `${c.name} (${c.short_name})` : c.name }}
            </option>
          </select>
        </div>

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

        <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div>
            <div class="text-sm font-semibold text-slate-800">Set as default</div>
            <div class="text-xs text-slate-500">Marks this account as the company default.</div>
          </div>
          <label class="inline-flex items-center cursor-pointer select-none">
            <input v-model="form.is_default" type="checkbox" class="sr-only peer" :disabled="saving" />
            <div
              class="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition"
            >
              <div
                class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
              ></div>
            </div>
          </label>
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
