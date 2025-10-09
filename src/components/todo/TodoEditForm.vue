<script setup>
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, nextTick, onMounted, ref } from 'vue'

import { deleteTodoSetting, findTodoSetting, upsertTodoSetting } from '@/services/todo'
import LoaderView from '../common/LoaderView.vue'
import FormHandler from '../FormHandler.vue'
import TodoSettingFields from './TodoSettingFields.vue'
import TodoTypeInput from './TodoTypeInput.vue'

// API helpers
// import {
//   findTodoSetting,
//   upsertTodoSetting, // new helper above
// } from '@/services/todoSettingService'

const props = defineProps({
  date: { type: String, default: getYearMonthDayFormat(new Date()) },
  todo: { type: Object, default: () => ({}) },
})

const state = ref()
const showTodoTypes = ref(false)
const titleRef = ref()
const todoStore = useTodoStore()
const emit = defineEmits(['update', 'cancelClick'])

const form = ref({
  title: '',
  todo_type: 'task',
  todo_type_id: '',
})

// --- Recurrence setting state controlled by parent ---
const setting = ref({
  id: null,
  repeat_type: 'daily',
  start_date: props.todo?.date || props.date || getYearMonthDayFormat(new Date()),
  end_date: null,
  weekly_day: null,
  monthly_mode: null,
  monthly_value: null,
  monthly_week: null,
  yearly_month: null,
  yearly_day: null,
})

const hasTodoSetting = ref(false)

const settingRef = ref({}) // to call buildPayload()

async function fetchTodo() {
  await todoStore.fetchTodo(props.todo?.id)
  form.value.title = todoStore.todo?.title
  form.value.todo_type_id = todoStore.todo?.todoable_id
}

const settingId = ref(null)

async function fetchSetting() {
  try {
    const { data } = await findTodoSetting(props.todo.id)
    const item = data?.setting
    if (item) {
      hasTodoSetting.value = true
      // hydrate
      settingId.value = item.id
      setting.value = {
        repeat_type: item.repeat_type ?? 'daily',
        start_date: item.start_date ?? setting.value.start_date,
        end_date: item.end_date ?? null,
        weekly_day: item.weekly_day ?? null,
        monthly_mode: item.monthly_mode ?? null,
        monthly_value: item.monthly_value ?? null,
        monthly_week: item.monthly_week ?? null,
        yearly_month: item.yearly_month ?? null,
        yearly_day: item.yearly_day ?? null,
      }
    } else {
      // keep defaults for creating new
      setting.value.id = null
    }
  } catch (e) {
    // optional: surface error in a toast
    console.error('Load setting failed:', e?.message || e)
  }
}

async function handleFormSubmit() {
  state.value = 'submitting'
  try {
    // 1) Update Todo
    await todoStore.updateTodo(props.todo.id, {
      title: form.value.title,
      todo_type: form.value.todo_type,
      todo_type_id: form.value.todo_type_id,
    })

    if (!hasTodoSetting.value) {
      settingId.value ? await deleteTodoSetting(props.todo.id, settingId.value) : null
    } else {
      // 2) Build payload from fields component and UPSERT the setting
      const payload = settingRef.value?.buildPayload
        ? settingRef.value.buildPayload()
        : { ...setting.value }

      // (ensure start_date at least)
      if (!payload.start_date) {
        payload.start_date = props.todo?.date || props.date || getYearMonthDayFormat(new Date())
      }
      // console.log({ payload })
      await upsertTodoSetting(props.todo.id, payload)
    }

    emit('update') // parent can refresh list/modal
  } finally {
    state.value = ''
  }
}

const settingsLoading = ref(false)

const selectedDate = computed(() => new Date(props.todo.date))

async function loadEverything() {
  await fetchTodo()
  settingsLoading.value = true
  await fetchSetting()
  settingsLoading.value = false
  await nextTick()
  titleRef.value?.focus()
}

onMounted(() => {
  loadEverything()
})
</script>

<template>
  <div class="relative" @click="showTodoTypes = false">
    <LoaderView
      v-if="todoStore.loading || settingsLoading"
      class="absolute inset-0 bg-opacity-80 text-center py-4 text-gray-500 z-10 flex items-center justify-center"
    >
      Loading...
    </LoaderView>

    <FormHandler
      @submit="handleFormSubmit"
      @clickCancel="emit('cancelClick')"
      :isSubmitting="state == 'submitting'"
      :isLoading="todoStore.loading || settingsLoading"
      :error="todoStore.error"
      id="todoEditForm"
    >
      <div class="border-b py-2 px-4">
        <h2 class="text-xl font-semibold">Edit Todo</h2>
      </div>

      <div class="p-4 min-h-[10vh] max-h-[50vh] overflow-y-auto">
        <div class="mb-2">
          <span class="font-semibold"> Date </span>
          <span>{{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}</span>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Title</label>
          <input
            ref="titleRef"
            v-model="form.title"
            required
            placeholder="Enter todo title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Task ID (optional)</label>
          <TodoTypeInput
            v-model:show="showTodoTypes"
            v-model:todoType="form.todo_type"
            v-model:todoTypeId="form.todo_type_id"
          />
        </div>

        <hr class="my-6" />

        <!-- {{ hasTodoSetting }} -->
        <!-- Recurrence fields (NO own buttons; parent controls submit) -->
        <TodoSettingFields ref="settingRef" v-model="setting" v-model:hasSetting="hasTodoSetting" />
      </div>
    </FormHandler>
  </div>
</template>
