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
    userRole="employee"
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
            'rounded text-sm h-[32px] w-20',
            selected?.type == types[0]?.value ? 'btn-2' : 'btn-3',
          ]"
        >
          {{ types[0]?.label }}
        </button>

        <button
          @click.prevent="changeType(types[1]?.value)"
          :class="[
            'rounded text-sm h-[32px] w-20',
            selected?.type == types[1]?.value ? 'btn-2 ' : 'btn-3',
          ]"
        >
          {{ types[1]?.label }}
        </button>

        <RouterLink
          to="/my-personal-activity-report"
          class="inline-flex items-center gap-2 rounded-md border border-sky-300 px-3 h-[32px] text-sm text-sky-700 bg-sky-50 hover:bg-sky-100 dark:border-sky-800 dark:text-sky-200 dark:bg-sky-900/20 dark:hover:bg-sky-900/40"
        >
          <i class="fas fa-tasks"></i>
          <span class="hidden lg:inline">Personal Activity Report (PAR)</span>
          <span class="inline lg:hidden">PAR</span>
        </RouterLink>
      </div>
    </template>
  </TodoSection>
</template>
