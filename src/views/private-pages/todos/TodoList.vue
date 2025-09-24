<script setup>
import TodoSection from '@/components/todo/TodoSection.vue'
import { useTodoStore } from '@/stores/useTodoStore'
import { ref } from 'vue'

const date = new Date()
const selected = ref({
  type: 'month-view',
  month: date.getMonth() + 1,
  day: date.getDate(),
  year: date.getFullYear(),
  week: date.getDay(),
})

const todoStore = useTodoStore()
</script>

<template>
  <div class="container mx-auto p-6">
    <h2 class="text-2xl font-bold mb-6">Todo List</h2>

    <div v-if="todoStore.error && !todoStore.loading" class="text-center py-4 text-red-500">
      {{ todoStore.error }}
    </div>

    <TodoSection
      :year="selected.year"
      :month="selected.month"
      :day="selected.day"
      :viewType="selected.type"
    >
      <template #typeSelection="{ types, changeType, selected }">
        <div class="flex items-center gap-2 mr-2">
          <button
            @click.prevent="changeType(types[0]?.value)"
            :class="[
              'rounded text-sm ',
              selected?.type == types[0]?.value
                ? 'text-blue-500 border px-2 font-semibold'
                : 'hover:underline text-blue-600',
            ]"
          >
            {{ types[0]?.label }}
          </button>
          <button
            @click.prevent="changeType(types[1]?.value)"
            :class="[
              'rounded text-sm ',
              selected?.type == types[1]?.value
                ? 'text-blue-500 border px-2 font-semibold '
                : 'hover:underline text-blue-600',
            ]"
          >
            {{ types[1]?.label }}
          </button>
        </div>
      </template>
    </TodoSection>
  </div>
</template>
