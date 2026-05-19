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

<style scoped>
/* Smooth fade transition for content */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scale and fade transition for view changes */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* Improved heading styling */
:deep(.todo-heading) {
  background: linear-gradient(135deg, #f0f4ff 0%, #f9fafb 100%);
  border-bottom: 1px solid #e5e7eb;
}

/* Better spacing for content areas */
:deep(.todo-calendar-view),
:deep(.todo-daily-view) {
  padding: 1.5rem;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  :deep(.todo-calendar-view),
  :deep(.todo-daily-view) {
    padding: 1rem;
  }
}
</style>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <div class="max-w-full mx-auto">
      <!-- Main container with professional styling -->
      <div class="bg-white overflow-hidden relative">
        <!-- Loading overlay with improved styling -->
        <LoaderView
          v-if="todoDateStore.loading"
          class="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-10 flex items-center justify-center"
        >
          <p class="text-gray-600 font-medium">Loading tasks...</p>
        </LoaderView>

        <!-- Header section -->
        <TodoHeading
          :selected="selected"
          class="z-20 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50"
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
              <!-- Error message with professional styling -->
              <transition name="fade">
                <div
                  v-if="todoDateStore.error"
                  class="m-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-md flex items-start gap-3"
                >
                  <div class="flex-shrink-0 mt-0.5">
                    <svg
                      class="h-5 w-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-red-700 font-semibold">Error</p>
                    <p class="text-red-600 text-sm">{{ todoDateStore.error }}</p>
                  </div>
                </div>
              </transition>
            </div>
          </template>
          <template #typeSelection="params">
            <slot name="typeSelection" v-bind="params"></slot>
          </template>
        </TodoHeading>

        <!-- Content area with transitions -->
        <transition name="fade-scale" mode="out-in">
          <div :key="selected.type" class="bg-white">
            <!-- Month view -->
            <TodoCalenderView
              :month="getMonthString"
              v-if="selected.type == 'month-view' && (companyId || userRole == 'employee')"
              class="p-4 sm:p-6"
              @dateClick="handleDateClick"
              @clickTodo="handleClickTodo"
              @clickDateCell="handleClickAddTodo"
            />

            <!-- Day view -->
            <TodosInDailyView
              :date="getDateString"
              v-if="selected.type == 'day-view' && (companyId || userRole == 'employee')"
              class="p-4 sm:p-6"
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
        </transition>
      </div>
    </div>

    <!-- Modal -->
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
