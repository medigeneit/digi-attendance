<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ year: null, month: null, day: null }),
  },
  /** Optional year options; নাহলে auto generate হবে */
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
  /* 🔹 কোন কোন সেকশন দেখাবে parent থেকেই কন্ট্রোল */
  showYear: {
    type: Boolean,
    default: true,
  },
  showMonth: {
    type: Boolean,
    default: true,
  },
  showDate: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const monthPickerRef = ref(null)
const datePickerRef  = ref(null)

const now = new Date()
const currentYear  = now.getFullYear()
const currentMonth = now.getMonth() + 1
const currentDay   = now.getDate()

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
const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

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
  return `${y}-${m}` // "YYYY-MM"
})

const dateInputValue = computed(() => {
  const y = localYear.value
  const m = String(localMonth.value).padStart(2, '0')
  const d = String(localDay.value).padStart(2, '0')
  return `${y}-${m}-${d}` // "YYYY-MM-DD"
})

/* Summary text, visible অংশ অনুযায়ী */
const summaryLabel = computed(() => {
  const y = localYear.value
  const mLabel = selectedMonthLabel.value
  const d = localDay.value

  const parts = []

  if (props.showDate) {
    parts.push(String(d).padStart(2, '0'))
  }
  if (props.showMonth) {
    parts.push(mLabel)
  }
  if (props.showYear) {
    parts.push(String(y))
  }

  // যদি সব off হয়ে যায়, তাও কিছু fallback দেখাই
  if (!parts.length) {
    return `${String(d).padStart(2, '0')} ${mLabel} ${y}`
  }
  return parts.join(' ')
})

/* ---------- Triggers ---------- */
function triggerMonthPicker() {
  if (!props.showMonth || !monthPickerRef.value || props.disabled) return
  if (typeof monthPickerRef.value.showPicker === 'function') {
    monthPickerRef.value.showPicker()
  } else {
    monthPickerRef.value.click()
  }
}

function triggerDatePicker() {
  if (!props.showDate || !datePickerRef.value || props.disabled) return
  if (typeof datePickerRef.value.showPicker === 'function') {
    datePickerRef.value.showPicker()
  } else {
    datePickerRef.value.click()
  }
}

/* ---------- Handlers ---------- */
function onMonthInput(e) {
  const val = e?.target?.value || '' // "YYYY-MM"
  if (!val) return
  const [yStr, mStr] = val.split('-')
  const y = Number(yStr) || currentYear
  const m = Number(mStr) || currentMonth
  const d = Math.min(localDay.value, daysInMonth(y, m))
  updateModel({ year: y, month: m, day: d })
}

function onDateInput(e) {
  const val = e?.target?.value || '' // "YYYY-MM-DD"
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
</script>

<template>
  <div class="flex flex-col gap-1 relative ">
    <!-- z-[9999] -->
    <!-- Top label -->
    <!-- <div class="flex items-center justify-between mb-0.5">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {{ label }}
      </p>
      <slot name="extra" />
    </div> -->

    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Year -->
      <select
        v-if="showYear"
        v-model="localYear"
        :disabled="disabled"
        class="input-1 py-1.5 px-3 rounded text-xs font-semibold uppercase tracking-wide
               text-slate-500 border-slate-200 bg-slate-50 disabled:opacity-50"
      >
        <option
          v-for="year in internalYearOptions"
          :key="year"
          :value="year"
        >
          {{ year }}
        </option>
      </select>

      <!-- Month -->
      <div
        v-if="showMonth"
        class="relative"
      >
        <button
          type="button"
          @click="triggerMonthPicker"
          :disabled="disabled"
          class="input-1 flex items-center justify-between gap-2 px-3 py-2 rounded
                 text-xs font-semibold uppercase tracking-wide text-slate-500
                 border-slate-200 bg-white shadow-sm disabled:opacity-50"
        >
          <i class="far fa-calendar-alt text-slate-400"></i>
          <span>{{ selectedMonthLabel }} - {{ localYear }}</span>
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

      <!-- Date -->
      <div
        v-if="showDate"
        class="relative"
      >
        <button
          type="button"
          @click="triggerDatePicker"
          :disabled="disabled"
          class="input-1 flex items-center justify-between gap-2 px-5 py-2 rounded
                 text-xs font-semibold uppercase tracking-wide text-slate-500
                 border-slate-200 bg-white shadow-sm disabled:opacity-50"
        >
          <i class="far fa-calendar text-slate-400"></i>
          <span>{{ selectedDateLabel }} - {{ selectedMonthLabel }}</span>
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
  </div>
</template>
