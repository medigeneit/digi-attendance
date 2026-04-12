<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const isPfRow = (row = {}) => {
  const code = String(row?.allowance_code || '').trim().toUpperCase()
  const name = String(row?.allowance_name || '').trim().toLowerCase()
  return code === 'PF' || name === 'provident fund'
}

const addRow = () => {
  emit('update:modelValue', [
    ...props.modelValue,
    { allowance_code: '', allowance_name: '', amount: '', is_active: true, remarks: '' },
  ])
}

const removeRow = (index) => {
  if (isPfRow(props.modelValue?.[index])) return
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

const updateRow = (index, field, value) => {
  const updated = props.modelValue.map((row, i) =>
    i === index ? { ...row, [field]: value } : row,
  )
  emit('update:modelValue', updated)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold text-blue-900">Additional Allowances</h3>
      <button type="button" class="btn-2 text-xs" @click="addRow">
        <i class="far fa-plus"></i> Add Row
      </button>
    </div>

    <div
      v-if="!modelValue.length"
      class="text-sm text-gray-400 italic py-3 text-center border border-dashed border-gray-200 rounded-lg"
    >
      No additional allowances. Click "Add Row" to add.
    </div>

    <div v-else class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-blue-50 text-blue-900 text-xs">
            <th class="px-3 py-2 text-left font-semibold">Code</th>
            <th class="px-3 py-2 text-left font-semibold">Name</th>
            <th class="px-3 py-2 text-right font-semibold">Amount</th>
            <th class="px-3 py-2 text-center font-semibold">Active</th>
            <th class="px-3 py-2 text-left font-semibold">Remarks</th>
            <th class="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(row, index) in modelValue" :key="index" class="bg-white">
            <td class="px-2 py-1.5">
              <input
                class="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                :value="row.allowance_code"
                @input="updateRow(index, 'allowance_code', $event.target.value)"
                placeholder="e.g. TA"
                :disabled="isPfRow(row)"
              />
            </td>
            <td class="px-2 py-1.5">
              <input
                class="w-40 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                :value="row.allowance_name"
                @input="updateRow(index, 'allowance_name', $event.target.value)"
                placeholder="Allowance name"
                :disabled="isPfRow(row)"
              />
            </td>
            <td class="px-2 py-1.5">
              <input
                class="w-28 border border-gray-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                type="number"
                min="0"
                step="0.01"
                :value="row.amount"
                @input="updateRow(index, 'amount', $event.target.value)"
                placeholder="0.00"
                :disabled="isPfRow(row)"
              />
            </td>
            <td class="px-2 py-1.5 text-center">
              <input
                type="checkbox"
                :checked="row.is_active"
                @change="updateRow(index, 'is_active', $event.target.checked)"
                class="w-4 h-4 accent-blue-600"
                :disabled="isPfRow(row)"
              />
            </td>
            <td class="px-2 py-1.5">
              <input
                class="w-36 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                :value="row.remarks"
                @input="updateRow(index, 'remarks', $event.target.value)"
                placeholder="Optional"
                :disabled="isPfRow(row)"
              />
            </td>
            <td class="px-2 py-1.5 text-center">
              <button
                v-if="!isPfRow(row)"
                type="button"
                @click="removeRow(index)"
                class="text-red-400 hover:text-red-600 transition-colors"
              >
                <i class="far fa-trash-alt text-xs"></i>
              </button>
              <span v-else class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                Locked
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
