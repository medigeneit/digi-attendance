<script setup>
import { ref } from 'vue'
import { useDisciplineReportStore } from '@/stores/useDisciplineReportStore'

const props = defineProps({
  userId: { type: [Number, String], required: true },
  year: { type: Number, required: true },
  value: { type: [Number, String], default: 0 },
  disabled: { type: Boolean, default: false },
})

const reportStore = useDisciplineReportStore()
const isSaving = ref(false)

const setScore = async (score) => {
  if (props.disabled || isSaving.value) return
  isSaving.value = true
  try {
    await reportStore.updateFinalScore({
      user_id: props.userId,
      year: props.year,
      score,
    })
  } catch (err) {
    console.error('Failed to update final outcome:', err)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center gap-1">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      class="score-dot"
      :class="{
        'score-dot--active': Number(value) === n,
        'score-dot--disabled': disabled,
      }"
      @click="setScore(n)"
    >
      {{ n }}
    </button>
  </div>
</template>

<style scoped>
.score-dot { @apply h-7 w-7 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800; }
.score-dot--active { @apply border-emerald-400 bg-emerald-50 text-emerald-700; }
.score-dot--disabled { @apply cursor-not-allowed opacity-50 hover:border-slate-200 hover:text-slate-600; }
</style>
