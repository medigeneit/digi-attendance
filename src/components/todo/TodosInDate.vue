<script setup>
import { useTodoStore } from '@/stores/useTodoStore'
import { computed } from 'vue'

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
  maxItems: {
    type: [Number],
    default: 3,
  },
})

const { getTodosByDate } = useTodoStore()

const todoInDate = computed(() => {
  let items = [],
    moreItemsCount = false,
    all = []
  if (typeof getTodosByDate == 'function') {
    const todos = getTodosByDate(props.date)
    all = Array.isArray(todos) ? todos : []
    items = all.slice(0, props.maxItems)
    moreItemsCount = all.length - items.length
  }

  return {
    all,
    items,
    moreItemsCount,
  }
})
</script>

<template>
  <div>
    <div
      v-for="todo in todoInDate.items"
      :key="todo.id"
      class="border bg-sky-600/70 rounded px-2 mb-2 text-sm text-sky-100 hover:bg-sky-600 hover:text-white cursor-pointer"
    >
      <div class="line-clamp-1">{{ todo.title }}</div>
    </div>
    <div v-if="todoInDate.moreItemsCount > 0" class="text-purple-600 text-center">
      + {{ todoInDate.moreItemsCount }} more todos
    </div>
  </div>
</template>
