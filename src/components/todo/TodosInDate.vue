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
  <div class="">
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
            <button
              type="button"
              :title="`${todo_date?.title} ${todo_date?.user ? '\nby:' : ''} ${todo_date?.user?.name} ${todo_date?.user?.department ? '\nDEPT:' : ''} ${todo_date.user?.department?.name}`"
              class="mb-1.5 flex min-h-6 w-full cursor-pointer items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition"
              :class="{
                'border-sky-100 bg-white text-sky-950 hover:border-sky-300 hover:bg-sky-50 font-semibold':
                  todo_date.status !== 'COMPLETED',
                'border-green-200 bg-green-50 text-green-900': todo_date.status === 'COMPLETED',
              }"
              @click.prevent.stop="emit('clickTodo', todo_date)"
            >
              <TodoStatusIcon
                :todoDate="todo_date"
                class="shrink-0 text-sm"
                size="x-small"
                :class="[todo_date.status == 'COMPLETED' ? '!text-green-800 ml-0.5' : '']"
              />

              <div class="min-w-0 flex-1 truncate">{{ todo_date.title }}</div>

              <template v-if="todo_date.user">
                <UserAvatar :user="todo_date.user" size="xsmall" class="shrink-0" />
              </template>
            </button>
          </slot>
        </template>
      </slot>
      <div v-if="todoDatesInDate.moreItemsCount > 0" class="text-purple-600 text-center text-xs sm:text-sm">
       <span>
         + {{ todoDatesInDate.moreItemsCount }}
       </span>
       <span class="hidden sm:inline">
         more todo{{
           todoDatesInDate.moreItemsCount > 1 ? 's' : ''
          }}
        </span>
      </div>
    </template>
  </div>
</template>
