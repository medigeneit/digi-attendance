<script setup>
import { useTodoStore } from '@/stores/useTodoStore'
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

const { getTodosByDate } = useTodoStore()

const todoInDate = computed(() => {
  let items = [],
    moreItemsCount = false,
    all = []
  if (typeof getTodosByDate == 'function') {
    const todos = getTodosByDate(props.date)
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
    <template v-if="todoInDate.items.length === 0">
      <slot name="noTodos">
        <div class="text-gray-400 text-center">No todos</div>
      </slot>
    </template>
    <template v-else>
      <slot
        name="todoItems"
        :todos="todoInDate.items"
        :allTodos="todoInDate.items"
        :moreItemsCount="todoInDate.moreItemsCount"
      >
        <template v-for="todo in todoInDate.items" :key="todo.id">
          <slot name="todoItem" :todo="todo" :moreItemsCount="todoInDate.moreItemsCount">
            <div
              :title="`${todo?.title} ${todo?.user ? '\nby:' : ''} ${todo?.user?.name} ${todo?.user?.department ? '\nDEPT:' : ''} ${todo.user?.department?.name}`"
              class="px-1 mb-2 text-sm rounded cursor-pointer flex items-center gap-2"
              :class="{
                'bg-sky-50 text-sky-900 hover:bg-sky-700 hover:text-white border border-sky-300':
                  todo.status !== 'COMPLETED',
                'bg-green-500 text-white': todo.status === 'COMPLETED',
              }"
              @click.prevent.stop="emit('clickTodo', todo)"
            >
              <TodoStatusIcon
                :todo="todo"
                class="text-sm"
                :class="[todo.status == 'COMPLETED' ? '!text-white' : '']"
              />

              <div class="line-clamp-1">{{ todo.title }}</div>

              <template v-if="todo.user">
                <UserAvatar :user="todo.user" size="xsmall" class="ml-auto" />
              </template>
            </div>
          </slot>
        </template>
      </slot>
      <div v-if="todoInDate.moreItemsCount > 0" class="text-purple-600 text-center">
        + {{ todoInDate.moreItemsCount }} more todo{{ todoInDate.moreItemsCount > 1 ? 's' : '' }}
      </div>
    </template>
  </div>
</template>
