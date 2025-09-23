<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import TodoHeading from '@/components/todo/TodoHeading.vue'
import TodoCalenderView from '@/components/todo/TodosInCalenderView.vue'
import TodosInDailyView from '@/components/todo/TodosInDailyView.vue'
import { useTodoStore } from '@/stores/useTodoStore'
import TodoCreateEditShow from '@/views/private-pages/todos/TodoCreateEditShow.vue'
import { computed, onMounted, ref } from 'vue'

const date = new Date()

const props = defineProps({
  year: { type: Number, default: () => new Date().getFullYear() },
  month: { type: Number, default: () => new Date().getMonth() + 1 },
  day: { type: Number, default: () => new Date().getDate() },
  week: { type: Number, default: () => new Date().getDay() },
  viewType: { type: String, default: 'month-view' },
})

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

function handleTodoUpdate() {
  todoModal.value = { ...todoModal.value, action: '' }
}

async function handleClickChangeStatusTodo(todoId, status) {
  await todoStore.updateTodoStatus(todoId, status)
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
  console.log({ props })
})
</script>

<template>
  <div>
    <!-- {{ props }} -->
    <div class="border bg-white relative">
      <LoaderView
        v-if="todoStore.loading"
        class="absolute inset-0 bg-opacity-80 text-center py-4 text-gray-500 z-10 flex items-center justify-center"
      >
        Loading...
      </LoaderView>

      <TodoHeading
        :selected="selected"
        class="border-b shadow z-20"
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
        @clickChangeStatus="handleClickChangeStatusTodo"
        @backClick="handleClickBackFromDayView"
        @update="handleTodoUpdate"
      />
    </div>

    <TodoCreateEditShow
      :todoModal="todoModal"
      @cancelClick="handleModalCancel"
      @update="handleTodoUpdate"
      @clickEdit="handleClickEditTodo"
    />
  </div>
</template>
