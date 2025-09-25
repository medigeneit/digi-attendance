<script setup>
import { getYearMonthDayFormat, getYearMonthFormat } from '@/libs/datetime'
import { computed, ref, watch } from 'vue'

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
    <div class="px-4 py-2 flex items-center bg-gray-50 group gap-2">
      <slot name="before" :selected="selected"></slot>

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
        <button class="btn-2 h-7" @click.prevent="handleClickOnPreviousMonth">
          Previous Month
        </button>
        <button class="btn-2 h-7" @click.prevent="handleClickOnNextMonth">Next Month</button>
      </div>

      <div class="ml-4 md:ml-auto flex items-center gap-2" v-if="selected_type == 'day-view'">
        <button class="btn-2 h-7" @click.prevent="handleClickOnPreviousDay">Previous Day</button>
        <button class="btn-2 h-7" @click.prevent="handleClickOnNextDay">Next Day</button>
      </div>

      <slot name="after" :selected="selected"></slot>
    </div>
    <slot name="bottom" :selected="selected"></slot>
  </div>
</template>
