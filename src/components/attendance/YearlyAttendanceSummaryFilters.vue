<script setup>
import { computed } from 'vue'
import SearchInput from '@/components/SearchInput.vue'
import SelectDropdown from '@/components/SelectDropdown.vue'

const props = defineProps({
  year: { type: [String, Number], default: '' },
  years: { type: Array, default: () => [] },
  companyId: { type: [String, Number], default: '' },
  companyOptions: { type: Array, default: () => [] },
  showCompanySelect: { type: Boolean, default: true },
  departmentId: { type: [String, Number], default: '' },
  departmentIdIsNull: { type: Boolean, default: false },
  departmentOptions: { type: Array, default: () => [] },
  search: { type: String, default: '' },
  isBusy: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:year',
  'update:companyId',
  'update:departmentId',
  'update:departmentIdIsNull',
  'update:search',
  'apply',
  'reset',
])

const selectedYear = computed({
  get: () => String(props.year || ''),
  set: (value) => emit('update:year', value || ''),
})

const selectedCompany = computed({
  get: () => String(props.companyId || ''),
  set: (value) => emit('update:companyId', value || ''),
})

const selectedDepartment = computed({
  get: () => (props.departmentIdIsNull ? '__null__' : String(props.departmentId || '')),
  set: (value) => {
    if (value === '__null__') {
      emit('update:departmentId', '')
      emit('update:departmentIdIsNull', true)
      return
    }
    emit('update:departmentId', value || '')
    emit('update:departmentIdIsNull', false)
  },
})

const departmentOptionsMerged = computed(() => [
  { id: '__null__', label: 'Unassigned/NULL' },
  ...props.departmentOptions,
])

const companyLabel = computed(() => {
  const current = props.companyOptions.find((c) => String(c.id) === String(props.companyId))
  return current?.label || 'Company not set'
})
</script>

<template>
  <div class="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
    <div class="grid gap-3 md:grid-cols-12 relative">
      <div class="md:col-span-2">
        <label class="top-label mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Year
        </label>
        <SelectDropdown
          v-model="selectedYear"
          :options="years"
          class="border-2 border-gray-200 rounded h-[36px] w-full bg-white"
        />
      </div>

      <div class="md:col-span-3 relative">
        <label class="top-label  block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Company 
        </label>
        <div v-if="showCompanySelect">
          <SelectDropdown
            v-model="selectedCompany"
            :options="companyOptions"
            class="border-2 border-gray-200 rounded h-[36px] w-full bg-white"
            clearable
          />
        </div>
        <div
          v-else
          class="flex h-[36px] items-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
        >
          {{ companyLabel }}
        </div>
      </div>

      <div class="md:col-span-3 relative" :class="{ 'opacity-60 pointer-events-none': !companyId }">
        <label class="top-label block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Department
        </label>
        <SelectDropdown
          v-model="selectedDepartment"
          :options="departmentOptionsMerged"
          class="border-2 border-gray-200 rounded h-[36px] w-full bg-white"
          clearable
        />
      </div>

      <div class="md:col-span-3 relative">
        <label class="top-label mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          User Search
        </label>
        <SearchInput
          :model-value="search"
          :debounce-time="300"
          placeholder="User ID or name"
          label=""
          @update:modelValue="(value) => $emit('update:search', value || '')"
        />
      </div>

      <div class="md:col-span-1 flex items-end justify-end gap-2">
        <button
          type="button"
          class="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          :disabled="isBusy"
          @click="$emit('reset')"
        >
          Reset
        </button>
        <button
          type="button"
          class="h-9 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          :disabled="isBusy"
          @click="$emit('apply')"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</template>
