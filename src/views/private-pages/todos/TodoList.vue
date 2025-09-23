<script setup>
import TodoHeading from '@/components/todo/TodoHeading.vue'
import TodoCalenderView from '@/components/todo/TodosInCalenderView.vue'
import TodosInDailyView from '@/components/todo/TodosInDailyView.vue'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, onMounted, ref } from 'vue'
import TodoCreateEditShow from './TodoCreateEditShow.vue'

const date = new Date()
const selected = ref({
  type: 'month-view',
  month: date.getMonth() + 1,
  day: date.getDate(),
  year: date.getFullYear(),
  week: date.getDay(),
})

const todoModal = ref({
  action: null,
})

const todoStore = useTodoStore()

async function handleReloadClick() {
  await todoStore.fetchTodos()
}

async function handleTodoUpdate() {
  todoModal.value = { ...todoModal.value, action: '' }
  await todoStore.fetchTodos()
}

async function handleClickCompleteTodo(todoId) {
  await todoStore.completeTodo(todoId)
}

async function handleClickDeleteTodo(todoId) {
  await todoStore.deleteTodo(todoId)
}

function handleClickBackFromDayView() {
  selected.value = {
    ...selected.value,
    type: 'month-view',
  }
}

function handleHeadingChange(changed) {
  selected.value = { ...selected.value, ...changed }
}

function handleDateClick(date) {
  const [year, month, day] = date.split('-').map(Number)

  selected.value = {
    ...selected.value,
    type: 'day-view',
    year,
    month,
    day,
  }
}

function handleClickTodo(todo) {
  todoModal.value = {
    ...todoModal.value,
    action: 'show',
    todo,
  }
}

function handleClickEditTodo(todo) {
  console.log({ todo })

  todoModal.value = {
    ...todoModal.value,
    action: 'edit',
    todo,
  }
}

function handleClickAddTodo(yearMonthDay) {
  todoModal.value = {
    ...todoModal.value,
    action: 'add',
    date: yearMonthDay,
  }
}

function handleModalCancel() {
  todoModal.value = {
    action: null,
    todo: null,
  }
}

const getDateString = computed(() => {
  const year = selected.value?.year?.toString()
  const month = selected.value?.month?.toString().padStart(2, '0')
  const day = selected.value?.day?.toString().padStart(2, '0')
  return `${year}-${month}-${day}`
})

const getMonthString = computed(() => {
  const year = selected.value?.year?.toString()
  const month = selected.value?.month?.toString().padStart(2, '0')
  return `${year}-${month}`
})

onMounted(async () => {
  await todoStore.fetchTodos()
})
</script>

<template>
  <div class="container mx-auto p-6">
    <h2 class="text-2xl font-bold mb-6">Todo List</h2>
    <div v-if="todoStore.loading" class="text-center py-4 text-gray-500">Loading...</div>
    <div v-else-if="todoStore.error" class="text-center py-4 text-red-500">
      {{ todoStore.error }}
    </div>

    <div class="border bg-white">
      <TodoHeading
        :selected="selected"
        @change="handleHeadingChange"
        @reload-click="handleReloadClick"
      />

      <TodoCalenderView
        :month="getMonthString"
        v-if="selected.type == 'month-view'"
        class="bg-white"
        @dateClick="handleDateClick"
        @clickTodo="handleClickTodo"
        @clickDateCell="handleClickAddTodo"
      />

      <TodosInDailyView
        :date="getDateString"
        v-if="selected.type == 'day-view'"
        @clickTodo="handleClickTodo"
        @clickEdit="handleClickEditTodo"
        @clickAdd="handleClickAddTodo"
        @clickDelete="handleClickDeleteTodo"
        @clickComplete="handleClickCompleteTodo"
        @backClick="handleClickBackFromDayView"
      />
    </div>

    <TodoCreateEditShow
      :todoModal="todoModal"
      @cancelClick="handleModalCancel"
      @updateTodo="handleTodoUpdate"
      @clickEdit="handleClickEditTodo"
    />
  </div>
</template>
