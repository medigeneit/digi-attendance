<script setup>
import { computed } from 'vue'
import SelectDropdown from './SelectDropdown.vue'
import UserAvatar from './UserAvatar.vue'
import UserChip from './user/UserChip.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: '',
  },
  employees: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: '--Select Employee--',
  },
  containment: {
    type: Object,
    default: () => window,
  },
})

const emit = defineEmits(['update:modelValue', 'clear'])

// Computed proxy for v-model
const selectedEmployeeId = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const searchByEmployee = (options, term) => {
  const needle = String(term || '').toLowerCase()

  return (options || []).filter((opt) => {
    if (opt == null) return false
    if (typeof opt === 'string' || typeof opt === 'number') {
      return String(opt).toLowerCase().includes(needle)
    }

    const name = String(opt.name || '').toLowerCase()
    const bnName = String(opt.bn_name || '').toLowerCase()
    const label = String(opt.label || '').toLowerCase()

    return name.includes(needle) || bnName.includes(needle) || label.includes(needle)
  })
}
</script>

<template>
  
  <SelectDropdown
    v-model="selectedEmployeeId"
    :options="employees"
    :containment="containment"
    :searchBy="searchByEmployee"
    clearable
  >
    <template #option="{ option }">
      <UserChip :user="option || {}" class="w-full min-w-48 overflow-hidden border relative" />
    </template>

    <template #list-header>
      <div
        class="text-xs pb-1 pt-2 px-2 border-b font-semibold text-gray-600 shadow-md uppercase whitespace-nowrap"
      >
        Employee list
      </div>
    </template>

    <template #no-options>
      <span class="text-xs whitespace-nowrap">No Employee(s) found</span>
    </template>

    <template #selected-option="{ option }">
      <slot name="selectedOption" :option="option">
        <div v-if="option || selectedEmployeeId === ''" class="relative w-full pr-6">
          <div class="flex items-center gap-2 text-sm text-gray-700" v-if="option">
            <UserAvatar :user="option" />
            <div class="line-clamp-1">{{ option?.label }}</div>
          </div>
          <div v-else class="text-sm text-gray-500 whitespace-nowrap">{{ placeholder }}</div>
        </div>
      </slot>
    </template>
  </SelectDropdown>
</template>
