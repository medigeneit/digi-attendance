<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  companyId: { type: [String, Number], default: '' },
  departmentId: { type: [String, Number], default: '' },
  employeeId: { type: [String, Number], default: '' },
  lineType: { type: String, default: 'all' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
})

const emit = defineEmits(['reloadClick', 'change'])

const state = reactive({
  companyId: String(props.companyId || ''),
  departmentId:
    props.departmentId !== '' && props.departmentId != null ? String(props.departmentId) : '',
  employeeId: String(props.employeeId || ''),
  lineType: props.lineType || 'all',
  startDate: props.startDate || '',
  endDate: props.endDate || '',
})

const payload = computed(() => ({
  companyId: state.companyId,
  departmentId: state.departmentId,
  employeeId: state.employeeId,
  lineType: state.lineType,
  startDate: state.startDate,
  endDate: state.endDate,
}))

function emitChange() {
  emit('change', { ...payload.value })
}

watch(
  () => [
    props.companyId,
    props.departmentId,
    props.employeeId,
    props.lineType,
    props.startDate,
    props.endDate,
  ],
  () => {
    state.companyId = String(props.companyId || '')
    state.departmentId =
      props.departmentId !== '' && props.departmentId != null ? String(props.departmentId) : ''
    state.employeeId = String(props.employeeId || '')
    state.lineType = props.lineType || 'all'
    state.startDate = props.startDate || ''
    state.endDate = props.endDate || ''
  },
)

watch(payload, emitChange, { deep: true })
</script>

<template>
  <div class="px-4 py-3 bg-gray-50">
    <div class="flex flex-wrap items-end gap-3">
      <slot name="before"></slot>
      <button
        class="px-2 py-2 disabled:text-gray-300 border size-[32px] flex items-center justify-center rounded-full print-hide"
        :class="{ 'animate-spin !bg-opacity-0': loading }"
        @click.prevent="emit('reloadClick')"
        :disabled="loading"
        title="Reload"
      >
        <i class="fas fa-redo" :class="[loading ? 'text-gray-400' : 'text-gray-500']"></i>
      </button>
      <span class="print-hide">
        <slot name="after"></slot>
      </span>

      <div class="flex flex-wrap items-end gap-3 flex-1 print-hide">
        <EmployeeFilter
          v-model:company_id="state.companyId"
          v-model:department_id="state.departmentId"
          v-model:employee_id="state.employeeId"
          v-model:line_type="state.lineType"
          :with-type="true"
          class="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4 xl:!grid-cols-5 flex-1"
        />

        <div class="flex items-end gap-3">
          <div class="relative w-[150px] sm:w-[170px]">
            <label
              class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
              >Start Date</label
            >
            <input
              type="date"
              v-model="state.startDate"
              class="border-2 border-gray-300 rounded px-3 py-2 text-sm w-full bg-white"
            />
          </div>
          <div class="relative w-[150px] sm:w-[170px]">
            <label
              class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
              >End Date</label
            >
            <input
              type="date"
              v-model="state.endDate"
              class="border-2 border-gray-300 rounded px-3 py-2 text-sm w-full bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .print-hide {
    display: none !important;
  }
}
</style>
