<template>
  <div v-if="timeLeft.total > 0">
    <span v-if="timeLeft.days">{{ timeLeft.days }}d </span>
    <span>{{ timeLeft.hours.toString().padStart(2, '0') }}h :</span>
    <span>{{ timeLeft.minutes.toString().padStart(2, '0') }}m :</span>
    <span>{{ timeLeft.seconds.toString().padStart(2, '0') }}s</span>
  </div>
  <div v-else>
    <slot name="expired">Time’s up!</slot>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  targetDateTime: string | Date
}>()

const timeLeft = ref(calculateTimeLeft())
let intervalId: any

function calculateTimeLeft() {
  const total = new Date(props.targetDateTime).getTime() - new Date().getTime()
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
</script>
