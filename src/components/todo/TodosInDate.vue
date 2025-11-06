<script setup>
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { computed } from 'vue'
import UserAvatar from '../UserAvatar.vue'
import TodoStatusIcon from './TodoStatusIcon.vue'

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
  maxItems: {
    type: [Number, String],
    default: 3,
  },
})

const emit = defineEmits(['clickTodo'])

// const { getTodosByDate } = useTodoStore()
const { getTodoDatesByDate } = useTodoDateStore()

const todoDatesInDate = computed(() => {
  let items = [],
    moreItemsCount = false,
    all = []
  if (typeof getTodoDatesByDate == 'function') {
    const todos = getTodoDatesByDate(props.date)
    all = Array.isArray(todos) ? todos : []

    if (props.maxItems === 'all') {
      return {
        all,
        items: all,
        moreItemsCount: 0,
      }
    }
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
    <template v-if="todoDatesInDate.items.length === 0">
      <slot name="noTodos">
        <div class="text-gray-400 text-center">No todos</div>
      </slot>
    </template>
    <template v-else>
      <slot
        name="todoItems"
        :todos="todoDatesInDate.items"
        :allTodos="todoDatesInDate.items"
        :moreItemsCount="todoDatesInDate.moreItemsCount"
      >
        <template v-for="todo_date in todoDatesInDate.items" :key="todo_date.id">
          <slot
            name="todoItem"
            :todoDate="todo_date"
            :moreItemsCount="todoDatesInDate.moreItemsCount"
          >
            <div
              :title="`${todo_date?.title} ${todo_date?.user ? '\nby:' : ''} ${todo_date?.user?.name} ${todo_date?.user?.department ? '\nDEPT:' : ''} ${todo_date.user?.department?.name}`"
              class="px-1 mb-2 text-xs rounded cursor-pointer flex items-center gap-2"
              :class="{
                'bg-sky-50 text-sky-900 hover:bg-sky-700 hover:text-white border border-sky-300':
                  todo_date.status !== 'COMPLETED',
                'bg-green-500 text-white': todo_date.status === 'COMPLETED',
              }"
              @click.prevent.stop="emit('clickTodo', todo_date)"
            >
              <TodoStatusIcon
                :todoDate="todo_date"
                class="text-sm"
                :class="[todo_date.status == 'COMPLETED' ? '!text-white' : '']"
              />

              <div class="line-clamp-1 text-[10px]">{{ todo_date.title }}</div>

              <template v-if="todo_date.user">
                <UserAvatar :user="todo_date.user" size="xsmall" class="ml-auto" />
              </template>
            </div>
          </slot>
        </template>
      </slot>
      <div v-if="todoDatesInDate.moreItemsCount > 0" class="text-purple-600 text-center">
        + {{ todoDatesInDate.moreItemsCount }} more todo{{
          todoDatesInDate.moreItemsCount > 1 ? 's' : ''
        }}
      </div>
    </template>
  </div>
</template>
