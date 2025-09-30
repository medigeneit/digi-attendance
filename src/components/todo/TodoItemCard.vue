<script setup>
import TodoStatusIcon from './TodoStatusIcon.vue'
defineProps({
  todo: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits([
  'clickTodo',
  'clickEdit',
  'clickDelete',
  'clickChangeStatus',
  'clickDelete',
])
</script>

<template>
  <div
    class="border rounded px-4 py-3 my-4 cursor-pointer flex items-center shadow-sm"
    :class="{
      'bg-green-100': todo.status == 'COMPLETED',
      'hover:bg-gray-50': todo.status != 'COMPLETED',
    }"
    @click.prevent="emit('clickTodo', todo)"
  >
    <TodoStatusIcon :todo="todo" />

    <div class="ml-4">
      <div
        class="line-clamp-1"
        :class="{
          'text-green-800': todo.status == 'COMPLETED',
          'text-blue-800': todo.status != 'COMPLETED',
        }"
      >
        {{ todo.id }} - {{ todo.title }}
      </div>

      <div class="mt-1 flex items-center gap-2" v-if="todo.user">
        <UserChip :user="todo.user" avatar-size="xsmall" />
        <div
          class="border border-sky-400 rounded-full text-sky-500 font-semibold bg-sky-50 px-1 py-0.5 text-xs inline-block"
        >
          {{ todo.user?.department?.name }}
        </div>
      </div>

      <!-- <div>{{ todo.user?.department }}</div> -->
    </div>
    <div class="line-clamp-2 ml-4 text-gray-500" v-if="todo.todo_type && todo.todo_type_id">
      {{ todo.todo_type }} id: {{ todo.todo_type_id }}
    </div>

    <div class="ml-auto flex items-center gap-2">
      <button
        title="Mark as Completed"
        v-if="todo.status === 'WORKING'"
        class="btn-icon bg-transparent text-green-400 border-green-400 border hover:bg-green-400 hover:text-white"
        @click.prevent.stop="() => emit('clickChangeStatus', todo, 'COMPLETED')"
      >
        <i class="fas fa-check"></i>
      </button>
      <button
        v-if="todo.status === 'PENDING'"
        title="Start Working"
        class="btn-icon bg-transparent text-red-400 border-red-400 border hover:bg-red-400 hover:text-white"
        @click.prevent.stop="() => emit('clickChangeStatus', todo, 'WORKING')"
      >
        <i class="fas fa-play ml-[4px]"></i>
      </button>

      <button
        class="btn-icon bg-sky-400 text-white hover:bg-sky-600 hover:text-white"
        @click.prevent.stop="emit('clickEdit', todo)"
      >
        <i class="fas fa-pen"></i>
      </button>
      <button
        class="btn-icon bg-red-400 text-white hover:bg-red-600 hover:text-white"
        @click.prevent.stop="() => emit('clickDelete', todo)"
      >
        <i class="fas fa-trash-alt"></i>
      </button>
      <button
        v-if="userRole == 'employee'"
        @click.stop.prevent="() => null"
        class="btn-icon bg-gray-400 text-white hover:bg-gray-600 hover:text-white handle"
      >
        <i class="fas fa-arrows-alt-v"></i>
      </button>
    </div>
  </div>
</template>
