<script setup>
import { reactive, ref } from 'vue'
import OverlyModal from '../common/OverlyModal.vue'
import TaskAddForm from './TaskAddForm.vue'
import TaskEditForm from './TaskEditForm.vue'
import TaskList from './TaskList.vue'

const props = defineProps({
  subTasks: Array,
  parentId: { type: Number, required: true },
})

const emit = defineEmits(['created', 'error'])

const editingId = ref()

const addForm = reactive({
  show: false,
  parentId: props.parentId,
  requirementId: null,
})

const goToAdd = (parentId) => {
  addForm.show = true
  addForm.parentId = parentId

  console.log({ addForm })
}

function handleTaskCreate() {
  addForm.show = false
  addForm.parentId = props.parentId
  emit('created')
}

function handleTaskUpdate() {
  editingId.value = false
  emit('updated')
}

function handleTaskAddClose() {
  addForm.show = false
  addForm.parentId = props.parentId
}
</script>
<template>
  <div>
    <OverlyModal v-if="editingId">
      <TaskEditForm :taskId="editingId" @close="editingId = null" @updated="handleTaskUpdate" />
    </OverlyModal>
    <OverlyModal v-if="addForm.show">
      <TaskAddForm
        :parentTaskId="addForm.parentId"
        :requirementId="addForm.requirementId"
        @task-created="handleTaskCreate"
        @error="handleTaskError"
        @close="handleTaskAddClose"
      />
    </OverlyModal>

    <TaskList
      :tasks="subTasks"
      @addClick="(taskId) => goToAdd(taskId)"
      @editClick="(taskId) => (editingId = taskId)"
    >
      <template #task:header>
        <div class="flex justify-between mt-5">
          <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold text-gray-800">Sub Tasks</h2>
          </div>

          <div class="flex flex-wrap items-center gap-2 mt-3">
            <button class="btn-1 ml-auto" @click.prevent="() => goToAdd(parentId)">
              Add Sub Task
            </button>
          </div>
        </div>
      </template>
    </TaskList>
  </div>
</template>
