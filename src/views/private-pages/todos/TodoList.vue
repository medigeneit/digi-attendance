<script setup>
import TodoCalenderView from '@/components/todo/TodoCalenderView.vue'
import TodoHeading from '@/components/todo/TodoHeading.vue'
import { getYearMonthDayFormat, getYearMonthFormat } from '@/libs/datetime'
import { todos } from '@/libs/dummy-todos.js'
import { useTodoStore } from '@/stores/useTodoStore'
import { onMounted, ref } from 'vue'

const selectedMonth = ref('')
const selectedDay = ref('')
const viewType = ref('month-view')

const store = useTodoStore()

onMounted(async () => {
  await store.fetchTodos()
  selectedDay.value = getYearMonthDayFormat(new Date())
  selectedMonth.value = getYearMonthFormat(new Date())
})

function handleReloadClick() {}

function getSelectedValue() {
  if (viewType.value == 'month-view') {
    return selectedMonth.value
  }
  if (viewType.value == 'day-view') {
    return selectedDay.value
  }
}

function handleHeadingChange({ value, selectedType }) {
  viewType.value = selectedType

  if (selectedType == 'month-view') {
    console.log(`${value}-01`)
    selectedMonth.value = value
    selectedDay.value = `${value}-01`
  }
  if (selectedType == 'day-view') {
    selectedDay.value = value
    selectedMonth.value = getYearMonthFormat(new Date(selectedDay.value))
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <h2 class="text-2xl font-bold mb-6">Todo List</h2>
    <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading...</div>
    <div v-else-if="store.error" class="text-center py-4 text-red-500">{{ store.error }}</div>

    <div class="border">
      <TodoHeading
        :selected-type="viewType"
        :selected-value="getSelectedValue()"
        @change="handleHeadingChange"
        @selectViewType="(vt) => (viewType = vt)"
        @reload-click="handleReloadClick"
      />

      {{ viewType }} - {{ selectedMonth }} -
      {{ selectedDay }}

      <TodoCalenderView
        :month="selectedMonth"
        :todos="todos"
        v-if="viewType == 'month-view'"
        class="bg-white"
      />
      <div v-if="viewType == 'day-view'" class="border min-h-40 text-center bg-white">
        Day View will be shown here
      </div>
    </div>
  </div>
</template>
