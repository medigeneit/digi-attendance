<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Number,
  minuteInterval: {
    type: Number,
    default: 1,
  },
  required: {
    type: Boolean,
    default: false,
  },
  hourMin: {
    type: Number,
    default: 0,
  },
  hourMax: {
    type: Number,
    default: 24,
  },
})

const emit = defineEmits(['update:modelValue', 'formatted'])

const selectedHour = ref('')
const selectedMinute = ref('00')

const pad = (n) => n.toString().padStart(2, '0')

// ✅ Float → HH:MM
watch(
  () => props.modelValue,
  (val) => {
    if (typeof val === 'number' && !isNaN(val)) {
      const hour = Math.floor(val)
      const minute = Math.round((val - hour) * 60)
      selectedHour.value = pad(hour)
      selectedMinute.value = pad(
        Math.round(minute / props.minuteInterval) * props.minuteInterval
      )
    }
  },
  { immediate: true }
)

// ✅ HH/MM → Float
watch([selectedHour, selectedMinute], () => {
  if (selectedHour.value !== '' && selectedMinute.value !== '') {
    const h = parseInt(selectedHour.value)
    const m = parseInt(selectedMinute.value)
    const floatVal = parseFloat((h + m / 60).toFixed(2))
    emit('update:modelValue', floatVal)
    emit('formatted', `${pad(h)}:${pad(m)}`)
  }
})

// ✅ Generate hour options based on min/max
const hourOptions = computed(() => {
  const options = []
  for (let i = props.hourMin; i <= props.hourMax; i++) {
    options.push(pad(i))
  }
  return options
})

// ✅ Generate minute options based on interval
const minuteOptions = computed(() => {
  const options = []
  for (let i = 0; i < 60; i += props.minuteInterval) {
    options.push(pad(i))
  }
  return options
})
</script>

<template>
  <div class="flex items-center gap-0.5 w-full">
    <!-- ঘণ্টা -->
    <select v-model="selectedHour" class="input-1 pl-1.5 pr-2.5" :required="required">
      <option value="" disabled>ঘণ্টা</option>
      <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}h</option>
    </select>

    <span>:</span>

    <!-- মিনিট -->
    <select v-model="selectedMinute" class="input-1 pl-1.5 pr-2.5">
      <option value="" disabled>মিনিট</option>
      <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}m</option>
    </select>
  </div>
</template>
