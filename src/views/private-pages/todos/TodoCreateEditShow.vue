<script setup>
import OverlyModal from '@/components/common/OverlyModal.vue'
import TodoAddForm from '@/components/todo/TodoAddForm.vue'
import TodoDateAddForm from '@/components/todo/TodoDateAddForm.vue'
import TodoEditForm from '@/components/todo/TodoEditForm.vue'
import TodoShow from '@/components/todo/TodoShow.vue'

defineProps({
  todoModal: {
    type: Object,
    required: true,
  },
  userRole: {
    type: String,
    required: 'employee',
  },
})

const emit = defineEmits([
  'cancelClick',
  'todoUpdate',
  'todoDateUpdate',
  'clickEdit',
  'clickDelete',
  'clickChangeStatus',
  'clickAddTodoDate',
])

function handleTodoUpdate() {
  emit('todoUpdate')
}

function handleTodoDateUpdate() {
  emit('todoDateUpdate')
}
</script>

<template>
  <OverlyModal v-if="todoModal.action == 'add'">
    <TodoAddForm
      @cancelClick="emit('cancelClick')"
      @update="handleTodoUpdate"
      :date="todoModal?.date"
      :userRole="userRole"
    />
  </OverlyModal>
  <OverlyModal v-if="todoModal.action == 'addDate'">
    <TodoDateAddForm
      @cancelClick="emit('cancelClick')"
      @update="handleTodoDateUpdate"
      :date="todoModal?.date"
      :todoId="todoModal?.todo_id"
      :userRole="userRole"
    />
  </OverlyModal>

  <OverlyModal v-if="todoModal.action == 'edit'">
    <TodoEditForm
      @cancelClick="emit('cancelClick')"
      @update="handleTodoUpdate"
      :todo="todoModal?.todo"
      :userRole="userRole"
    />
  </OverlyModal>

  <OverlyModal v-if="todoModal.action == 'show'">
    <TodoShow
      @cancelClick="emit('cancelClick')"
      @update="handleTodoDateUpdate"
      @clickEdit="(todo) => emit('clickEdit', todo)"
      @clickAddTodoDate="(...params) => emit('clickAddTodoDate', ...params)"
      @clickDelete="(todoId) => emit('clickDelete', todoId)"
      @clickChangeStatus="(todoId, status) => emit('clickChangeStatus', todoId, status)"
      :todoDate="todoModal?.todo"
      :userRole="userRole"
    />
  </OverlyModal>
</template>
