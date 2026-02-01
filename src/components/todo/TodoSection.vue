<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import TodoHeading from '@/components/todo/TodoHeading.vue'
import TodoCalenderView from '@/components/todo/TodosInCalenderView.vue'
import TodosInDailyView from '@/components/todo/TodosInDailyView.vue'
import { getCalendarRange, getLastDateOfMonth, getYearMonthDayFormat } from '@/libs/datetime'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { useTodoStore } from '@/stores/useTodoStore'
import TodoCreateEditShow from '@/views/private-pages/todos/TodoCreateEditShow.vue'
import { computed, onMounted, ref, watch } from 'vue'

const date = new Date()

const props = defineProps({
  year: { type: Number, default: () => new Date().getFullYear() },
  month: { type: Number, default: () => new Date().getMonth() + 1 },
  day: { type: Number, default: () => new Date().getDate() },
  week: { type: Number, default: () => new Date().getDay() },
  type: { type: String, default: 'month-view' },

  companyId: { type: String, default: '' },
  departmentId: { type: String, default: '' },
  employeeId: { type: String, default: '' },
  lineType: { type: String, default: '' },
  status: { type: String, default: '' },

  userRole: { type: String, default: 'employee' },
})

const selected = ref({
  type: 'month-view',
  month: date.getMonth() + 1,
  day: date.getDate(),
  year: date.getFullYear(),
  week: date.getDay(),
})

const emit = defineEmits(['changeInput'])

watch(
  () => ({ ...selected.value }),
  (changedSelected) => {
    emit('changeInput', changedSelected)
  },
)

watch(
  () => ({
    year: props.year,
    month: props.month,
    day: props.day,
    week: props.week,
    type: props.type,
  }),
  (changedProps) => {
    selected.value = { ...changedProps }
  },
  { immediate: true },
)

const todoModal = ref({
  action: null,
})

const todoStore = useTodoStore()
const todoDateStore = useTodoDateStore()

async function handleReloadClick() {
  await fetchTodos()
}

function handleTodoUpdate() {
  todoModal.value = { ...todoModal.value, action: '' }
  fetchTodos()
}

function handleTodoDateUpdate() {
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
  console.log({ todo })
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

function handleClickAddTodo(yearMonthDay, mainTodoId) {
  console.log({ yearMonthDay, mainTodoId })

  todoModal.value = {
    ...todoModal.value,
    action: 'add',
    date: yearMonthDay,
    todo_id: mainTodoId,
    formReadonlyValues: { date: true },
  }
}

function handleClickAddTodoDate(todoId, yearMonthDay) {
  console.log({ yearMonthDay, todoId })

  todoModal.value = {
    ...todoModal.value,
    action: 'addDate',
    date: yearMonthDay,
    todo_id: todoId,
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

async function fetchTodos() {
  const [year, month] = [Number(props.year), Number(props.month)]

  const startDate1 = getYearMonthDayFormat(new Date(year, month - 1, 1))
  const endDate1 = getYearMonthDayFormat(getLastDateOfMonth(year, month - 1))

  console.log('FETCHING...', { startDate1, endDate1 })

  const [startDate, endDate] = getCalendarRange(year, month - 1)
  console.log('FETCHING...', { startDate, endDate })

  if (props.userRole == 'employee') {
    // await todoStore.fetchMyTodos()

    await todoDateStore.fetchMyTodoDates({
      'start-date': startDate,
      'end-date': endDate,
    })
  } else {
    await todoDateStore.fetchTodoDates({
      'company-id': props.companyId,
      'department-id': props.departmentId,
      'employee-id': props.employeeId,
      'line-type': props.lineType,
      'start-date': startDate,
      'end-date': endDate,
      status: props.status,
    })
  }
}

onMounted(() => {
  todoDateStore.emptyTodoDates()
  fetchTodos()
})

watch(
  () => ({
    'company-id': props.companyId,
    'department-id': props.departmentId,
    'employee-id': props.employeeId,
    'line-type': props.lineType,
    status: props.status,
    month: props.month,
  }),
  () => fetchTodos(),
)
</script>

<template>
  <div>
    <div class="bg-white relative">
      <LoaderView
        v-if="todoDateStore.loading"
        class="absolute inset-0 bg-opacity-80 text-center py-4 text-gray-500 z-10 flex items-center justify-center"
      >
        Loading...
      </LoaderView>

      <TodoHeading
        :selected="selected"
        class="z-20 rounded-b-md"
        @change="handleHeadingChange"
        @reload-click="handleReloadClick"
      >
        <template #before="params">
          <slot name="beforeHeader" v-bind="params"></slot>
        </template>
        <template #inner="params">
          <slot name="innerHeader" v-bind="params"></slot>
        </template>
        <template #after="params">
          <slot name="afterHeader" v-bind="params"></slot>
        </template>
        <template #bottom="params">
          <div>
            <slot name="bottomHeader" v-bind="params"></slot>
            <div
              v-if="todoDateStore.error"
              class="text-red-600 py-4 text-semibold text-center text-xl min-h-[50vh] flex items-center justify-center"
            >
              {{ todoDateStore.error }}
            </div>
          </div>
        </template>
        <template #typeSelection="params">
          <slot name="typeSelection" v-bind="params"></slot>
        </template>
      </TodoHeading>

      <TodoCalenderView
        :month="getMonthString"
        v-if="selected.type == 'month-view' && (companyId || userRole == 'employee')"
        class="bg-white"
        @dateClick="handleDateClick"
        @clickTodo="handleClickTodo"
        @clickDateCell="handleClickAddTodo"
      />

      <TodosInDailyView
        :date="getDateString"
        v-if="selected.type == 'day-view' && (companyId || userRole == 'employee')"
        :userRole="userRole"
        @clickTodo="handleClickTodo"
        @clickEdit="handleClickEditTodo"
        @clickAdd="handleClickAddTodo"
        @clickDelete="handleClickDeleteTodo"
        @clickChangeStatus="handleClickChangeStatusTodo"
        @backClick="handleClickBackFromDayView"
        @update="handleTodoUpdate"
        @addCarryClick="handleClickAddTodo"
      />
    </div>

    <TodoCreateEditShow
      :todoModal="todoModal"
      :userRole="userRole"
      @cancelClick="handleModalCancel"
      @todoUpdate="handleTodoUpdate"
      @todoDateUpdate="handleTodoDateUpdate"
      @clickEdit="handleClickEditTodo"
      @clickAddTodoDate="handleClickAddTodoDate"
    />
  </div>
</template>
