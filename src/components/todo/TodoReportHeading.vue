<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  companyId: { type: [String, Number], default: '' },
  departmentId: { type: [String, Number], default: '' },
  employeeId: { type: [String, Number], default: '' },
  lineType: { type: String, default: 'all' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
})

const employeeFilterRef = ref(null)
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

function updateDateCountByDay(countBy) {
  const startDate = new Date(state.startDate)
  startDate.setDate(startDate.getDate() + countBy)
  state.startDate = startDate.toISOString().split('T')[0]

  const endDate = new Date(state.endDate)
  endDate.setDate(endDate.getDate() + countBy)
  state.endDate = endDate.toISOString().split('T')[0]
}

watch(payload, emitChange, { deep: true })

defineExpose({
  employees: computed(() => employeeFilterRef.value?.employees || []),
})
</script>

<template>
  <div class="px-4 py-4 md:py-3 bg-white rounded-md border">
    <div class="flex flex-wrap items-center gap-3">
      <slot name="before"></slot>
      <button
        class="btn-icon print-hide"
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

      <div
        class="flex flex-col md:flex-row flex-wrap items-end md:ml-auto w-full md:w-auto gap-x-3 gap-y-4 print-hide"
      >
        <EmployeeFilter
          ref="employeeFilterRef"
          v-model:company_id="state.companyId"
          v-model:department_id="state.departmentId"
          v-model:employee_id="state.employeeId"
          v-model:line_type="state.lineType"
          :with-type="true"
          class="flex-1 gap-y-4 md:flex items-center justify-between w-full md:w-auto"
        />

        <div class="flex items-center justify-between w-full md:w-auto gap-3">
          <button
            class="btn-3 px-3 rounded size-[31px]"
            @click.prevent="() => updateDateCountByDay(-1)"
          >
            <span class="fas fa-arrow-left"></span>
          </button>
          <div class="relative h-[32px] w-[150px] sm:w-[170px]">
            <label
              class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
              >Start Date</label
            >
            <input
              type="date"
              v-model="state.startDate"
              class="border-2 border-gray-300 rounded px-3 h-[32px] text-sm w-full bg-white"
            />
          </div>
          <div class="relative h-[32px] w-[150px] sm:w-[170px]">
            <label
              class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30"
              >End Date</label
            >
            <input
              type="date"
              v-model="state.endDate"
              class="border-2 border-gray-300 rounded px-3 h-[32px] text-sm w-full bg-white"
            />
          </div>

          <button
            class="btn-3 px-3 rounded size-[31px]"
            @click.prevent="() => updateDateCountByDay(1)"
          >
            <span class="fas fa-arrow-right"></span>
          </button>
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
