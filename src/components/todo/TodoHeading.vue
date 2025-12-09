<script setup>
import { getYearMonthDayFormat, getYearMonthFormat } from '@/libs/datetime'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  selected: {
    type: Object,
    default: () => {
      return {
        type: 'month-view',
        month: '',
        day: '',
        year: '',
        week: '',
      }
    },
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const availableTypes = [
  {
    value: 'month-view',
    label: 'Monthly',
  },
  {
    value: 'day-view',
    label: 'Daily',
  },
  // {
  //   value: 'year-view',
  //   label: 'Year',
  // },
  // {
  //   value: 'week-view',
  //   label: 'Weekly',
  // },
  // {
  //   value: 'list-view',
  //   label: 'Todo List',
  // },
]

const emit = defineEmits(['reloadClick', , 'change'])

const selected_type = ref()

function handleTypeChange(type) {
  selected_type.value = type

  emit('change', {
    ...props.selected,
    type: type,
  })
}

watch(
  () => props.selected?.type,
  (t) => handleTypeChange(t),
  { immediate: true },
)

const selectedDateArray = computed(() => {
  if (selected_type.value == 'month-view' && props.selected.year && props.selected.month) {
    return [props.selected.year, props.selected.month - 1, 1]
  }

  if (
    selected_type.value == 'day-view' &&
    props.selected.year &&
    props.selected.month &&
    props.selected.day
  ) {
    return [props.selected.year, props.selected.month - 1, props.selected.day]
  }

  return [new Date().getFullYear(), new Date().getMonth(), new Date().getDate()]
})

/***********Date change when type is month-view **************/
function handleClickCurrentMonth() {
  if (selected_type.value == 'month-view') {
    const today = new Date()
    changeSelected(today)
    // emitChange(getYearMonthFormat(today))
  }
}

function handleClickOnNextMonth() {
  if (selected_type.value == 'month-view') {
    // const [year, month] = input?.value?.split('-').map(Number)
    // const date = new Date(year, month, 1)
    // const [year, month, day] = selectedDateArray

    const date = new Date(...selectedDateArray.value)
    date.setMonth(date.getMonth() + 1)
    changeSelected(date)
    // emitChange(getYearMonthFormat(date))
  }
}

function handleClickOnPreviousMonth() {
  if (selected_type.value == 'month-view') {
    // const [year, month] = input?.value?.split('-').map(Number)
    // const date = new Date(year, month, 1)

    const date = new Date(...selectedDateArray.value)
    date.setMonth(date.getMonth() - 1)
    changeSelected(date)
    // emitChange(getYearMonthFormat(date))
  }
}

/***********Date change when type is day-view **************/
function handleClickOnToday() {
  if (selected_type.value == 'day-view') {
    const today = new Date()
    changeSelected(today)
    // emitChange(getYearMonthDayFormat(today))
  }
}

function handleClickOnNextDay() {
  if (selected_type.value == 'day-view') {
    // const today = new Date(input?.value)

    const today = new Date(...selectedDateArray.value)

    today.setDate(today.getDate() + 1)
    changeSelected(today)
    // emitChange(getYearMonthDayFormat(today))
  }
}

function handleClickOnPreviousDay() {
  if (selected_type.value == 'day-view') {
    // const today = new Date(input.value)

    const today = new Date(...selectedDateArray.value)

    today.setDate(today.getDate() - 1)
    changeSelected(today)
    // emitChange(getYearMonthDayFormat(today))
  }
}

function changeSelected(date) {
  emit('change', {
    type: selected_type.value,
    month: date.getMonth() + 1,
    day: date.getDate(),
    year: date.getFullYear(),
    week: date.getDay(),
  })
}

const input = computed(() => {
  if (selected_type.value == 'month-view') {
    return `${props.selected.year}-${props.selected.month.toString().padStart(2, '0')}`
  }

  if (selected_type.value == 'day-view') {
    return `${props.selected.year}-${props.selected.month
      .toString()
      .padStart(2, '0')}-${props.selected.day.toString().padStart(2, '0')}`
  }

  return props.selected
})

const handleInputChange = (event) => {
  if (selected_type.value == 'month-view') {
    const [year, month] = event.target.value?.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    changeSelected(date)
  }

  if (selected_type.value == 'day-view') {
    const date = new Date(event.target?.value)
    changeSelected(date)
  }
}
</script>

<template>
  <div>
    <div
      class="px-4 py-2 flex items-center lg:justify-start flex-wrap bg-gray-50 group md:gap-x-2 gap-y-4"
    >
      <slot name="before" :selected="selected"></slot>

      <button
        class="px-2 py-2 disabled:text-gray-300 border size-[32px] flex items-center justify-center rounded-full"
        :class="{ 'animate-spin !bg-opacity-0': loading }"
        @click.prevent="emit('reloadClick')"
        :disabled="loading"
      >
        <i class="fas fa-redo" :class="[loading ? 'text-gray-400' : 'text-gray-500']"></i>
      </button>

      <slot
        name="typeSelection"
        :selected="selected"
        :types="availableTypes"
        :changeType="handleTypeChange"
      >
        <select
          class="px-2 h-7 border rounded"
          :value="selected_type"
          @change="(e) => handleTypeChange(e.target.value)"
        >
          <option v-for="type in availableTypes" :value="type.value" :key="type.id">
            {{ type.label }}
          </option>
        </select>
      </slot>

      <button
        class="h-7"
        @click.prevent="handleClickCurrentMonth"
        v-if="selected_type == 'month-view'"
      >
        <!-- Current Month -->
      </button>

      <button class="h-7" @click.prevent="handleClickOnToday" v-if="selected_type == 'day-view'">
        <!-- Today -->
      </button>

      <slot name="inner" :selected="selected"></slot>

      <div
        class="md:ml-auto flex items-center justify-between md:justify-start gap-2 w-full lg:w-auto"
        v-if="selected_type == 'month-view'"
      >
        <button class="btn-3 px-3 rounded h-7" @click.prevent="handleClickOnPreviousMonth">
          <span class="fas fa-arrow-left"></span>
          <!-- <span class="hidden lg:inline">Previous Month</span> -->
        </button>

        <input
          v-if="selected_type == 'month-view'"
          type="month"
          :value="input"
          @input="handleInputChange"
          class="border-2 px-2 rounded border-blue-900"
        />

        <button class="btn-3 px-3 rounded h-7 md:ml-0" @click.prevent="handleClickOnNextMonth">
          <!-- <span class="hidden lg:inline">Next Month</span> -->
          <span class="fas fa-arrow-right"></span>
        </button>
      </div>

      <div
        class="md:ml-auto flex items-center justify-between md:justify-start gap-2 w-full lg:w-auto"
        v-if="selected_type == 'day-view'"
      >
        <button class="btn-3 px-3 rounded h-7" @click.prevent="handleClickOnPreviousDay">
          <span class="fas fa-arrow-left"></span>
          <!-- <span class="hidden lg:inline">Previous Day</span> -->
        </button>

        <input
          v-if="selected_type == 'day-view'"
          type="date"
          :value="input"
          @input="handleInputChange"
          class="border-2 px-2 rounded border-blue-900 w-28"
        />

        <button class="btn-3 px-3 rounded h-7 md:ml-0" @click.prevent="handleClickOnNextDay">
          <!-- <span class="hidden lg:inline">Next Day</span> -->
          <span class="fas fa-arrow-right"></span>
        </button>
      </div>

      <slot name="after" :selected="selected"></slot>
    </div>
    <slot name="bottom" :selected="selected"></slot>
  </div>
</template>
