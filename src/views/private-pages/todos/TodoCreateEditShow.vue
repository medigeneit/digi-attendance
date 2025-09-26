<script setup>
import OverlyModal from '@/components/common/OverlyModal.vue'
import TodoAddForm from '@/components/todo/TodoAddForm.vue'
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

const emit = defineEmits(['cancelClick', 'update', 'clickEdit', 'clickDelete', 'clickChangeStatus'])

function handleTodoUpdate() {
  emit('update')
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
      @update="handleTodoUpdate"
      @clickEdit="(todo) => emit('clickEdit', todo)"
      @clickDelete="(todoId) => emit('clickDelete', todoId)"
      @clickChangeStatus="(todoId, status) => emit('clickChangeStatus', todoId, status)"
      :todo="todoModal?.todo"
      :userRole="userRole"
    />
  </OverlyModal>
</template>
