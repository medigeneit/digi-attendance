<script setup>
import { computed, defineExpose, reactive, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      id: null,
      repeat_type: 'daily',
      start_date: null,
      end_date: null,
      // weekly
      weekly_day: null,
      // monthly
      monthly_mode: null, // 'day_of_month' | 'day_of_week'
      monthly_value: null, // 1..31
      monthly_week: null, // first..fifth
      // yearly
      yearly_month: null, // 1..12
      yearly_day: null, // 1..31
    }),
  },
  disabled: { type: Boolean, default: false },
  hasSetting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'update:hasSetting'])

const repeatTypes = ['daily', 'weekly', 'monthly', 'yearly']
const weeklyDays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']
const monthlyModes = ['day_of_month', 'day_of_week']
const monthlyWeeks = ['first', 'second', 'third', 'fourth', 'fifth']

const form = reactive({ ...props.modelValue })

const showSettings = computed({
  get: () => props.hasSetting,
  set: (value) => emit('update:hasSetting', value),
})

watch(
  () => props.modelValue,
  (v) => Object.assign(form, v || {}),
  { deep: true },
)

watch(form, (v) => emit('update:modelValue', { ...v }), { deep: true })

function resetIrrelevantFields() {
  if (form.repeat_type !== 'weekly') {
    form.weekly_day = null
  }

  if (form.repeat_type !== 'monthly') {
    form.monthly_mode = null
    form.monthly_value = null
    form.monthly_week = null
    if (form.repeat_type !== 'weekly') form.weekly_day = null
  } else {
    if (form.monthly_mode === 'day_of_month') {
      form.monthly_week = null
      form.weekly_day = null
    } else if (form.monthly_mode === 'day_of_week') {
      form.monthly_value = null
    } else {
      form.monthly_value = null
      form.monthly_week = null
      form.weekly_day = null
    }
  }

  if (form.repeat_type !== 'yearly') {
    form.yearly_month = null
    form.yearly_day = null
  }
}

watch(() => form.repeat_type, resetIrrelevantFields)
watch(() => form.monthly_mode, resetIrrelevantFields)
// watch(
//   () => showSettings.value,
//   (show) => {
//     if (!show) {
//       console.log('Changed!')

//       form.id = null
//       form.repeat_type = 'daily'
//       form.start_date = null
//       form.end_date = null
//       // weekly
//       form.weekly_day = null
//       // monthly
//       form.monthly_mode = null // 'day_of_month' | 'day_of_week'
//       form.monthly_value = null // 1..31
//       form.monthly_week = null // first..fifth
//       // yearly
//       form.yearly_month = null // 1..12
//       form.yearly_day = null // 1..31
//     }
//   },
// )

// For parent: get compact validated payload
function buildPayload() {
  const base = {
    repeat_type: form.repeat_type,
    start_date: form.start_date,
    end_date: form.end_date || null,
  }

  if (form.repeat_type === 'weekly') {
    return { ...base, weekly_day: form.weekly_day }
  }
  if (form.repeat_type === 'monthly') {
    if (form.monthly_mode === 'day_of_month') {
      return {
        ...base,
        monthly_mode: 'day_of_month',
        monthly_value: toIntOrNull(form.monthly_value),
      }
    }
    if (form.monthly_mode === 'day_of_week') {
      return {
        ...base,
        monthly_mode: 'day_of_week',
        monthly_week: form.monthly_week,
        weekly_day: form.weekly_day,
      }
    }
  }
  if (form.repeat_type === 'yearly') {
    return {
      ...base,
      yearly_month: toIntOrNull(form.yearly_month),
      yearly_day: toIntOrNull(form.yearly_day),
    }
  }
  // daily
  return base
}

function toIntOrNull(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const ruleSummary = computed(() => {
  if (!showSettings.value) {
    return 'No Repeat'
  }

  const rt = form.repeat_type
  if (rt === 'daily') return 'Every day'
  if (rt === 'weekly' && form.weekly_day) return `Every week on ${form.weekly_day.toUpperCase()}`
  if (rt === 'monthly') {
    if (form.monthly_mode === 'day_of_month' && form.monthly_value)
      return `Every month on day ${form.monthly_value}`
    if (form.monthly_mode === 'day_of_week' && form.monthly_week && form.weekly_day) {
      return `Every month on ${form.monthly_week} ${form.weekly_day.toUpperCase()}`
    }
    return 'Every month'
  }
  if (rt === 'yearly' && form.yearly_month && form.yearly_day) {
    return `Every year on ${String(form.yearly_month).padStart(2, '0')}-${String(form.yearly_day).padStart(2, '0')}`
  }
  return '—'
})

defineExpose({ buildPayload, resetIrrelevantFields })
</script>

<template>
  <div class="mt-4 border rounded-md">
    <div
      class="px-4 py-2 bg-gray-50 flex items-center justify-between"
      :class="[showSettings ? 'rounded-t-md border-b' : 'rounded-md']"
    >
      <h3 class="font-semibold">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" class="size-4" v-model="showSettings" />
          Repeat Todo
        </label>
      </h3>
      <div class="text-sm font-semibold italic text-red-800">
        {{ ruleSummary }}
      </div>
    </div>

    <div
      class="p-4 space-y-4"
      v-if="showSettings"
      :class="{ 'opacity-60 pointer-events-none': disabled }"
    >
      <div class="grid md:grid-cols-3 gap-4">
        <!-- Repeat Type -->
        <div>
          <label class="block text-sm font-medium mb-1">Repeat Type</label>
          <select v-model="form.repeat_type" class="w-full border rounded px-3 py-2">
            <option v-for="opt in repeatTypes" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <!-- Start Date -->
        <div>
          <label class="block text-sm font-medium mb-1">Start Date</label>
          <input v-model="form.start_date" type="date" class="w-full border rounded px-3 py-2" />
        </div>

        <!-- End Date -->
        <div>
          <label class="block text-sm font-medium mb-1">End Date (optional)</label>
          <input v-model="form.end_date" type="date" class="w-full border rounded px-3 py-2" />
        </div>
      </div>

      <!-- Weekly -->
      <div v-if="form.repeat_type === 'weekly'" class="grid md:grid-cols-3 gap-4">
        <div class="col-span-full">
          <label class="block text-sm font-medium mb-1">Weekly Day</label>
          <div class="w-full border rounded px-3 py-2 flex items-center gap-4" required>
            <label v-for="d in weeklyDays" :key="d" class="cursor-pointer">
              <input type="radio" :value="d" v-model="form.weekly_day" />
              <span class="ml-1">
                {{ d.toUpperCase() }}
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- Monthly -->
      <div v-if="form.repeat_type === 'monthly'" class="space-y-4">
        <div class="grid md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Monthly Mode</label>
            <select v-model="form.monthly_mode" class="w-full border rounded px-3 py-2" required>
              <option disabled value="">Select mode</option>
              <option v-for="m in monthlyModes" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>

          <div v-if="form.monthly_mode === 'day_of_month'">
            <label class="block text-sm font-medium mb-1">Day of Month (1–31)</label>
            <input
              v-model.number="form.monthly_value"
              type="number"
              min="1"
              max="31"
              class="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div v-if="form.monthly_mode === 'day_of_week'">
            <label class="block text-sm font-medium mb-1">Week</label>
            <select v-model="form.monthly_week" class="w-full border rounded px-3 py-2" required>
              <option disabled value="">Select week</option>
              <option v-for="w in monthlyWeeks" :key="w" :value="w">{{ w }}</option>
            </select>
          </div>

          <div v-if="form.monthly_mode === 'day_of_week'" class="col-span-full">
            <label class="block text-sm font-medium mb-1">Weekday</label>
            <div class="w-full border rounded px-3 py-2 flex items-center gap-4" required>
              <label v-for="d in weeklyDays" :key="d" class="cursor-pointer">
                <input type="radio" :value="d" v-model="form.weekly_day" />
                <span class="ml-1">
                  {{ d.toUpperCase() }}
                </span>
              </label>
            </div>
            <!-- <select v-model="form.weekly_day" class="w-full border rounded px-3 py-2" required>
              <option disabled value="">Select day</option>
              <option v-for="d in weeklyDays" :key="d" :value="d">{{ d.toUpperCase() }}</option>
            </select> -->
          </div>
        </div>
      </div>

      <!-- Yearly -->
      <div v-if="form.repeat_type === 'yearly'" class="grid md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Month (1–12)</label>
          <input
            v-model.number="form.yearly_month"
            type="number"
            min="1"
            max="12"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Day (1–31)</label>
          <input
            v-model.number="form.yearly_day"
            type="number"
            min="1"
            max="31"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>
      </div>
    </div>
  </div>
</template>
