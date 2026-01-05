<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ year: null, month: null, day: null }),
  },
  yearOptions: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: 'Period',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  showSummary: {
    type: Boolean,
    default: true,
  },
  showYear: { type: Boolean, default: true },
  showMonth: { type: Boolean, default: true },
  showDate: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'change'])

const monthPickerRef = ref(null)
const datePickerRef = ref(null)

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1
const currentDay = now.getDate()

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

/* ---------- Local proxies (year / month / day) ---------- */
const localYear = computed({
  get() {
    return props.modelValue?.year || currentYear
  },
  set(val) {
    const y = Number(val) || currentYear
    const m = localMonth.value
    const d = Math.min(localDay.value, daysInMonth(y, m))
    updateModel({ year: y, month: m, day: d })
  },
})

const localMonth = computed({
  get() {
    return props.modelValue?.month || currentMonth
  },
  set(val) {
    const m = Number(val) || currentMonth
    const y = localYear.value
    const d = Math.min(localDay.value, daysInMonth(y, m))
    updateModel({ year: y, month: m, day: d })
  },
})

const localDay = computed({
  get() {
    return props.modelValue?.day || currentDay
  },
  set(val) {
    const d = Number(val) || currentDay
    const y = localYear.value
    const m = localMonth.value
    const maxD = daysInMonth(y, m)
    updateModel({ year: y, month: m, day: Math.min(d, maxD) })
  },
})

/* ---------- Year options ---------- */
const internalYearOptions = computed(() => {
  if (props.yearOptions && props.yearOptions.length) return props.yearOptions
  const base = currentYear
  const arr = []
  for (let y = base - 3; y <= base + 1; y++) arr.push(y)
  return arr
})

/* ---------- Labels / values ---------- */
const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const selectedMonthLabel = computed(() => {
  const idx = Number(localMonth.value) - 1
  if (idx < 0 || idx > 11) return 'Month'
  return monthNames[idx]
})

const selectedDateLabel = computed(() => {
  const d = localDay.value
  return d ? String(d).padStart(2, '0') : 'Day'
})

const monthInputValue = computed(() => {
  const y = localYear.value
  const m = String(localMonth.value).padStart(2, '0')
  return `${y}-${m}` // YYYY-MM
})

const dateInputValue = computed(() => {
  const y = localYear.value
  const m = String(localMonth.value).padStart(2, '0')
  const d = String(localDay.value).padStart(2, '0')
  return `${y}-${m}-${d}` // YYYY-MM-DD
})

const summaryLabel = computed(() => {
  const y = localYear.value
  const mLabel = selectedMonthLabel.value
  const d = localDay.value

  const parts = []
  if (props.showDate) parts.push(String(d).padStart(2, '0'))
  if (props.showMonth) parts.push(mLabel)
  if (props.showYear) parts.push(String(y))

  if (!parts.length) return `${String(d).padStart(2, '0')} ${mLabel} ${y}`
  return parts.join(' ')
})

/* ✅ Compact mode (যখন শুধু ১টা control show হবে) */
const visibleCount = computed(() => {
  return [props.showYear, props.showMonth, props.showDate].filter(Boolean).length
})
const isCompactMode = computed(() => visibleCount.value === 1)

/* ---------- Triggers ---------- */
function triggerMonthPicker() {
  if (!props.showMonth || !monthPickerRef.value || props.disabled) return
  if (typeof monthPickerRef.value.showPicker === 'function') monthPickerRef.value.showPicker()
  else monthPickerRef.value.click()
}

function triggerDatePicker() {
  if (!props.showDate || !datePickerRef.value || props.disabled) return
  if (typeof datePickerRef.value.showPicker === 'function') datePickerRef.value.showPicker()
  else datePickerRef.value.click()
}

/* ---------- Handlers ---------- */
function onMonthInput(e) {
  const val = e?.target?.value || ''
  if (!val) return
  const [yStr, mStr] = val.split('-')
  const y = Number(yStr) || currentYear
  const m = Number(mStr) || currentMonth
  const d = Math.min(localDay.value, daysInMonth(y, m))
  updateModel({ year: y, month: m, day: d })
}

function onDateInput(e) {
  const val = e?.target?.value || ''
  if (!val) return
  const [yStr, mStr, dStr] = val.split('-')
  const y = Number(yStr) || currentYear
  const m = Number(mStr) || currentMonth
  const d = Number(dStr) || currentDay
  updateModel({ year: y, month: m, day: d })
}

function updateModel(next) {
  const fixed = {
    year: next.year || currentYear,
    month: next.month || currentMonth,
    day: next.day || currentDay,
  }
  emit('update:modelValue', fixed)
  emit('change', fixed)
}

/* ---- stepping ---- */
function stepByDays(delta) {
  const next = new Date(localYear.value, localMonth.value - 1, localDay.value)
  next.setDate(next.getDate() + delta)
  updateModel({ year: next.getFullYear(), month: next.getMonth() + 1, day: next.getDate() })
}

function stepByMonths(delta) {
  const next = new Date(localYear.value, localMonth.value - 1 + delta, 1)
  const maxD = daysInMonth(next.getFullYear(), next.getMonth() + 1)
  updateModel({
    year: next.getFullYear(),
    month: next.getMonth() + 1,
    day: Math.min(localDay.value, maxD),
  })
}

function stepByYears(delta) {
  const y = localYear.value + delta
  const m = localMonth.value
  const maxD = daysInMonth(y, m)
  updateModel({ year: y, month: m, day: Math.min(localDay.value, maxD) })
}

/* fallback for non-compact mixed mode */
function stepPeriod(delta) {
  if (props.disabled) return
  if (props.showDate) return stepByDays(delta)
  if (props.showMonth) return stepByMonths(delta)
  if (props.showYear) return stepByYears(delta)
}
</script>

<template>
  <div class="flex flex-col gap-1 relative">
    <label class="top-label -top-1 text-[11px] font-semibold tracking-wide">
      {{ label }}
    </label>

    <!-- ✅ COMPACT FILTER STYLE (Year/Month/Date all same) -->
    <div v-if="isCompactMode" class="inline-flex items-center gap-2">
      <!-- Year only -->
      <div
        v-if="showYear"
        class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-1 shadow-sm"
      >
        <button
          type="button"
          aria-label="Previous Year"
          @click="stepByYears(-1)"
          :disabled="disabled"
          class="inline-flex h-7 w-7 items-center justify-center rounded
                 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-40"
        >
          <i class="far fa-chevron-left text-[11px]"></i>
        </button>

        <select
          v-model="localYear"
          :disabled="disabled"
          class="h-7 min-w-[76px] rounded-md border border-slate-200 bg-white px-2
                 text-sm font-medium text-slate-700
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-50"
        >
          <option v-for="year in internalYearOptions" :key="year" :value="year">
            {{ year }}
          </option>
        </select>

        <button
          type="button"
          aria-label="Next Year"
          @click="stepByYears(1)"
          :disabled="disabled"
          class="inline-flex h-7 w-7 items-center justify-center rounded
                 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-40"
        >
          <i class="far fa-chevron-right text-[11px]"></i>
        </button>
      </div>

      <!-- Month only -->
      <div
        v-else-if="showMonth"
        class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-1 shadow-sm"
      >
        <button
          type="button"
          aria-label="Previous Month"
          @click="stepByMonths(-1)"
          :disabled="disabled"
          class="inline-flex h-7 w-7 items-center justify-center rounded
                 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-40"
        >
          <i class="far fa-chevron-left text-[11px]"></i>
        </button>

        <button
          type="button"
          @click="triggerMonthPicker"
          :disabled="disabled"
          class="inline-flex h-7 items-center gap-2 rounded-md border border-slate-200 bg-white px-3
                 text-sm font-medium text-slate-700
                 transition hover:bg-slate-50
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-50"
        >
          <i class="far fa-calendar-alt text-slate-400 text-[12px]"></i>
          <span class="whitespace-nowrap">{{ selectedMonthLabel.toUpperCase() }} - {{ localYear }}</span>
          <i class="far fa-chevron-down text-[10px] text-slate-400"></i>
        </button>

        <input
          ref="monthPickerRef"
          type="month"
          class="pointer-events-none absolute opacity-0"
          :value="monthInputValue"
          @change="onMonthInput"
        />

        <button
          type="button"
          aria-label="Next Month"
          @click="stepByMonths(1)"
          :disabled="disabled"
          class="inline-flex h-7 w-7 items-center justify-center rounded
                 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-40"
        >
          <i class="far fa-chevron-right text-[11px]"></i>
        </button>
      </div>

      <!-- Date only -->
      <div
        v-else-if="showDate"
        class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-1 shadow-sm"
      >
        <button
          type="button"
          aria-label="Previous Day"
          @click="stepByDays(-1)"
          :disabled="disabled"
          class="inline-flex h-7 w-7 items-center justify-center rounded
                 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-40"
        >
          <i class="far fa-chevron-left text-[11px]"></i>
        </button>

        <button
          type="button"
          @click="triggerDatePicker"
          :disabled="disabled"
          class="inline-flex h-7 items-center gap-2 rounded-md border border-slate-200 bg-white px-3
                 text-sm font-medium text-slate-700
                 transition hover:bg-slate-50
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-50"
        >
          <i class="far fa-calendar text-slate-400 text-[12px]"></i>
          <span class="whitespace-nowrap">
            {{ selectedDateLabel }} {{ selectedMonthLabel.toUpperCase() }} {{ localYear }}
          </span>
          <i class="far fa-chevron-down text-[10px] text-slate-400"></i>
        </button>

        <input
          ref="datePickerRef"
          type="date"
          class="pointer-events-none absolute opacity-0"
          :value="dateInputValue"
          @change="onDateInput"
        />

        <button
          type="button"
          aria-label="Next Day"
          @click="stepByDays(1)"
          :disabled="disabled"
          class="inline-flex h-7 w-7 items-center justify-center rounded
                 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700
                 focus:outline-none focus:ring-2 focus:ring-blue-200
                 disabled:opacity-40"
        >
          <i class="far fa-chevron-right text-[11px]"></i>
        </button>
      </div>
    </div>

    <!-- ✅ Mixed mode fallback (when multiple are true) -->
    <div
      v-else
      class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 p-2 shadow-sm backdrop-blur w-full"
      :class="disabled ? 'opacity-70' : ''"
    >
      <button
        type="button"
        aria-label="Previous"
        @click="stepPeriod(-1)"
        :disabled="disabled"
        class="input-1 inline-flex h-9 w-9 items-center justify-center rounded-lg
               text-slate-500 border-slate-200 bg-white shadow-sm
               transition hover:bg-slate-50 hover:text-slate-700
               focus:outline-none focus:ring-2 focus:ring-blue-200
               disabled:opacity-50"
      >
        <i class="far fa-chevron-left text-[13px]"></i>
      </button>

      <div class="flex-1 min-w-0 flex flex-wrap items-center justify-center gap-2">
        <div v-if="showYear" class="min-w-[110px]">
          <select
            v-model="localYear"
            :disabled="disabled"
            class="input-1 w-full py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wide
                   text-slate-600 border-slate-200 bg-slate-50 shadow-sm
                   transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200
                   disabled:opacity-50"
          >
            <option v-for="year in internalYearOptions" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div v-if="showMonth" class="relative min-w-[170px]">
          <button
            type="button"
            @click="triggerMonthPicker"
            :disabled="disabled"
            class="input-1 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                   text-xs font-semibold uppercase tracking-wide text-slate-600
                   border-slate-200 bg-white shadow-sm
                   transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200
                   disabled:opacity-50"
          >
            <span class="flex items-center gap-2 min-w-0">
              <i class="far fa-calendar-alt text-slate-400"></i>
              <span class="truncate">{{ selectedMonthLabel }} - {{ localYear }}</span>
            </span>
            <i class="far fa-chevron-down text-[10px] text-slate-400"></i>
          </button>
          <input
            ref="monthPickerRef"
            type="month"
            class="pointer-events-none absolute inset-0 opacity-0"
            :value="monthInputValue"
            @change="onMonthInput"
          />
        </div>

        <div v-if="showDate" class="relative min-w-[170px]">
          <button
            type="button"
            @click="triggerDatePicker"
            :disabled="disabled"
            class="input-1 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                   text-xs font-semibold uppercase tracking-wide text-slate-600
                   border-slate-200 bg-white shadow-sm
                   transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200
                   disabled:opacity-50"
          >
            <span class="flex items-center gap-2 min-w-0">
              <i class="far fa-calendar text-slate-400"></i>
              <span class="truncate">{{ selectedDateLabel }} - {{ selectedMonthLabel }}</span>
            </span>
            <i class="far fa-chevron-down text-[10px] text-slate-400"></i>
          </button>
          <input
            ref="datePickerRef"
            type="date"
            class="pointer-events-none absolute inset-0 opacity-0"
            :value="dateInputValue"
            @change="onDateInput"
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="Next"
        @click="stepPeriod(1)"
        :disabled="disabled"
        class="input-1 inline-flex h-9 w-9 items-center justify-center rounded-lg
               text-slate-500 border-slate-200 bg-white shadow-sm
               transition hover:bg-slate-50 hover:text-slate-700
               focus:outline-none focus:ring-2 focus:ring-blue-200
               disabled:opacity-50"
      >
        <i class="far fa-chevron-right text-[13px]"></i>
      </button>
    </div>
  </div>
</template>
