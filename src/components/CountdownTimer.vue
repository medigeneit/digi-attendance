<template>
  <!-- {{ { daysLeft, hoursLeft, minutesLeft, secondsLeft } }} -->
  <span v-if="timeLeft.total > 0">
    <span v-if="!hideIfZeroValue || daysLeft != '00'">{{ daysLeft }}d : </span>
    <span v-if="!hideIfZeroValue || hoursLeft != '00'">{{ hoursLeft }}h : </span>
    <span v-if="!hideIfZeroValue || minutesLeft != '00'">{{ minutesLeft }}m : </span>
    <span v-if="!hideIfZeroValue || secondsLeft != '00'">{{ secondsLeft }}s</span>
  </span>
  <span v-else>
    <slot name="expired"></slot>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

type TimerProp = {
  targetDateTime?: string | Date
  millisecond?: number
  hideIfZeroValue?: boolean
}

const props = withDefaults(defineProps<TimerProp>(), {
  targetDateTime: null,
  millisecond: null,
  hideIfZeroValue: false,
})

let total = 0

const timeLeft = ref(calculateTimeLeft())
let intervalId: any

function isNumericInput() {
  return props.millisecond && typeof props.millisecond == 'number'
}

function calculateTimeLeft() {
  if (isNumericInput()) {
    if (total) {
      total -= 1000
    }
  } else {
    total = new Date(props.targetDateTime).getTime() - new Date().getTime()
  }

  const seconds = Math.floor((total / 1000) % 60)
  const minutes = Math.floor((total / 1000 / 60) % 60)
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  return { total, days, hours, minutes, seconds }
}

function updateCountdown() {
  timeLeft.value = calculateTimeLeft()
}

onMounted(() => {
  if (isNumericInput()) {
    total = props.millisecond
  }

  console.log('MOUNTED')

  updateCountdown()

  intervalId = setInterval(() => {
    updateCountdown()
    if (timeLeft.value.total <= 0) {
      clearInterval(intervalId)
    }
  }, 1000)
})

onUnmounted(() => clearInterval(intervalId))

watch(
  () => props.targetDateTime,
  () => {
    updateCountdown()
    clearInterval(intervalId)
  },
)

const daysLeft = computed(() => {
  return timeLeft.value.days.toString().padStart(2, '0')
})

const hoursLeft = computed(() => {
  return timeLeft.value.hours.toString().padStart(2, '0')
})
const minutesLeft = computed(() => {
  return timeLeft.value.minutes.toString().padStart(2, '0')
})
const secondsLeft = computed(() => {
  return timeLeft.value.seconds.toString().padStart(2, '0')
})
</script>
