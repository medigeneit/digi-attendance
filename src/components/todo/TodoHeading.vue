<script setup>
import { getYearMonthDayFormat, getYearMonthFormat } from '@/libs/datetime'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  selectedType: {
    type: String,
    default: 'month-view',
  },
  selectedValue: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['reloadClick', 'selectViewType', 'change'])

const selected_type = ref()

function handleTypeChange() {
  emit('selectViewType', selected_type.value)
}

watch(
  () => props.selectedType,
  (t) => (selected_type.value = t),
  { immediate: true },
)

/***********Date change when type is month-view **************/
function handleClickCurrentMonth() {
  if (selected_type.value == 'month-view') {
    const today = new Date()
    emitChange(getYearMonthFormat(today))
  }
}

function handleClickOnNextMonth() {
  if (selected_type.value == 'month-view') {
    const [year, month] = input?.value?.split('-').map(Number)
    const date = new Date(year, month, 1)
    date.setMonth(date.getMonth())
    emitChange(getYearMonthFormat(date))
  }
}

function handleClickOnPreviousMonth() {
  if (selected_type.value == 'month-view') {
    const [year, month] = input?.value?.split('-').map(Number)
    const date = new Date(year, month, 1)
    date.setMonth(date.getMonth() - 2)
    emitChange(getYearMonthFormat(date))
  }
}

/***********Date change when type is day-view **************/
function handleClickOnToday() {
  if (selected_type.value == 'day-view') {
    const today = new Date()
    emitChange(getYearMonthDayFormat(today))
  }
}

function handleClickOnNextDay() {
  if (selected_type.value == 'day-view') {
    const today = new Date(input?.value)
    today.setDate(today.getDate() + 1)
    emitChange(getYearMonthDayFormat(today))
  }
}

function handleClickOnPreviousDay() {
  if (selected_type.value == 'day-view') {
    const today = new Date(input.value)
    today.setDate(today.getDate() - 1)
    emitChange(getYearMonthDayFormat(today))
  }
}

const input = computed(() => {
  return props.selectedValue
})

function emitChange(value) {
  emit('change', {
    value,
    selectedType: selected_type.value,
  })
}

const handleInputChange = (e) => {
  emitChange(e.target.value)
  emit('selectViewType', selected_type.value)
}
</script>

<template>
  <div class="px-4 py-2 flex items-center bg-gray-50 group">
    <h2 class="leading-none font-semibold text-lg">Monthly Task</h2>

    <select class="mx-4 px-2 h-7 border rounded" v-model="selected_type" @change="handleTypeChange">
      <option value="day-view">Day</option>
      <!-- <option value="week-view">Week</option> -->
      <option value="month-view">Month</option>
      <!-- <option value="year-view">Year</option> -->
      <!-- <option value="todo-list-view">Todo List</option> -->
    </select>

    <input
      v-if="selected_type == 'month-view'"
      type="month"
      :value="input"
      @input="handleInputChange"
      class="border px-2 rounded"
    />
    <input
      v-if="selected_type == 'day-view'"
      type="date"
      :value="input"
      @input="handleInputChange"
      class="border px-2 rounded"
    />

    <button
      class="btn-3 mx-4 h-7"
      @click.prevent="handleClickCurrentMonth"
      v-if="selected_type == 'month-view'"
    >
      Current Month
    </button>

    <button
      class="btn-3 mx-4 h-7"
      @click.prevent="handleClickOnToday"
      v-if="selected_type == 'day-view'"
    >
      Today
    </button>

    <button
      class="btn-3 px-2 py-2 mx-4 size-7 disabled:text-gray-300 disabled:border-gray-300"
      :class="{ 'animate-spin text-gray-300 border-gray-300 !bg-opacity-0': loading }"
      @click.prevent="emit('reloadClick')"
      :disabled="loading"
    >
      <i class="fas fa-redo-alt"></i>
    </button>

    <div class="ml-4 md:ml-auto flex items-center gap-2" v-if="selected_type == 'month-view'">
      <button class="btn-2 h-7" @click.prevent="handleClickOnPreviousMonth">Previous Month</button>
      <button class="btn-2 h-7" @click.prevent="handleClickOnNextMonth">Next Month</button>
    </div>
    <div class="ml-4 md:ml-auto flex items-center gap-2" v-if="selected_type == 'day-view'">
      <button class="btn-2 h-7" @click.prevent="handleClickOnPreviousDay">Previous Day</button>
      <button class="btn-2 h-7" @click.prevent="handleClickOnNextDay">Next Day</button>

      <!-- <input
        type="date"
        :value="selectedDay"
        @input="(e) => emit('change', e.target?.value)"
        class="border px-2 rounded"
      /> -->
    </div>
  </div>
</template>
