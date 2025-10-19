<script setup>
import { useAuthStore } from '@/stores/auth'
import DepartmentChip from '../DepartmentChip.vue'
import UserChip from '../user/UserChip.vue'
import TodoStatusIcon from './TodoStatusIcon.vue'
defineProps({
  todoDate: {
    type: Object,
    required: true,
  },
  hideDepartment: {
    type: Boolean,
    default: false,
  },
  hideUser: {
    type: Boolean,
    default: false,
  },
  hideSortingBtn: {
    type: Boolean,
    default: false,
  },
  userRole: {
    type: String,
    default: 'employee',
  },
})

const authStore = useAuthStore()

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
    class="px-4 py-4 md:py-2 cursor-pointer flex flex-wrap items-center gap-y-2 gap-x-4 text-sm"
    :class="{
      'bg-green-100': todoDate.status == 'COMPLETED',
      'hover:bg-gray-50': todoDate.status != 'COMPLETED',
    }"
    @click.prevent="emit('clickTodo', todoDate)"
  >
    <!-- v-for="todo in allTodos"
                :key="todoDate.id" -->

    <TodoStatusIcon :todoDate="todoDate" />
    <div class="">
      <div
        class="line-clamp-1"
        :class="{
          'text-green-800': todoDate.status == 'COMPLETED',
          'text-blue-800': todoDate.status != 'COMPLETED',
        }"
      >
        {{ todoDate.id }} - {{ todoDate.title }}
      </div>

      <div class="mt-1 flex items-center gap-2" v-if="todoDate.user">
        <UserChip :user="todoDate.user" avatar-size="xsmall" v-if="!hideUser" />
        <DepartmentChip :department="todoDate?.user?.department" v-if="!hideDepartment" />
      </div>
    </div>

    <div
      class="line-clamp-2 text-gray-500 whitespace-nowrap mr-2"
      v-if="todoDate.todo?.todo_type && todoDate.todo?.todo_type_id"
    >
      {{ todoDate.todo?.todo_type }}
      <RouterLink
        class="text-blue-600 font-semibold underline hover:text-sky-400"
        @click.stop="null"
        :to="{
          name: userRole == 'employee' ? 'MyTaskShow' : 'TaskShow',
          params: { id: todoDate.todo?.todo_type_id },
        }"
      >
        <i class="fas fa-link"></i>
        {{ todoDate.todo?.todo_type_id }}
      </RouterLink>
    </div>

    <div class="md:ml-auto w-full md:w-auto flex items-center justify-center gap-2">
      <div class="flex items-center gap-1 text-red-600" v-if="todoDate.status == 'WORKING'">
        <span class="fas fa-circle animate-pulse text-xs"></span>
        <span class="text-xs">Working</span>
      </div>
      <template v-if="todoDate.user_id === authStore.user?.id">
        <button
          title="Mark as Completed"
          v-if="todoDate.status === 'WORKING'"
          class="btn-icon bg-transparent text-green-400 border-green-400 border hover:bg-green-400 hover:text-white"
          @click.prevent.stop="() => emit('clickChangeStatus', todoDate, 'COMPLETED')"
        >
          <i class="fas fa-check"></i>
        </button>

        <button
          v-if="todoDate.status === 'PENDING'"
          title="Start Working"
          class="btn-icon bg-transparent text-red-400 border-red-400 border hover:bg-red-400 hover:text-white"
          @click.prevent.stop="() => emit('clickChangeStatus', todoDate, 'WORKING')"
        >
          <i class="fas fa-play ml-[4px]"></i>
        </button>

        <button
          class="btn-icon bg-sky-400 text-white hover:bg-sky-600 hover:text-white"
          @click.prevent.stop="emit('clickEdit', todoDate?.todo)"
        >
          <i class="fas fa-pen"></i>
        </button>

        <button
          class="btn-icon bg-red-400 text-white hover:bg-red-600 hover:text-white"
          @click.prevent.stop="() => emit('clickDelete', todoDate)"
        >
          <i class="fas fa-trash-alt"></i>
        </button>
      </template>
      <button
        v-if="!hideSortingBtn"
        @click.stop.prevent="() => null"
        class="btn-icon bg-gray-400 text-white hover:bg-gray-600 hover:text-white handle"
      >
        <i class="fas fa-arrows-alt-v"></i>
      </button>
    </div>
  </div>
</template>
