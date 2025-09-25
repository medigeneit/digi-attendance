<script setup>
import TodoSection from '@/components/todo/TodoSection.vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function handleTodoInputChange(changedSelected) {
  router.push({
    query: {
      ...route.query,
      ...{
        [`todos[type]`]: changedSelected.type,
        [`todos[year]`]: changedSelected.year,
        [`todos[month]`]: changedSelected.month,
        [`todos[day]`]: changedSelected.day,
      },
    },
  })
}
</script>

<template>
  <TodoSection
    :type="route.query[`todos[type]`]"
    :year="route.query[`todos[year]`]"
    :month="route.query[`todos[month]`]"
    :day="route.query[`todos[day]`]"
    listUserRole="employee"
    @changeInput="handleTodoInputChange"
  >
    <template #beforeHeader>
      <h2 class="text-md font-medium">Todo List</h2>
    </template>

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
</template>
