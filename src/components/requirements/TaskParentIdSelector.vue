<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { ref, watch } from 'vue'

const props = defineProps({
  fromDepartmentId: {
    type: Number,
  },
})

const emit = defineEmits(['parentIdSelect'])
const taskStore = useTaskStore()
const subTaskChosen = ref(false)

watch(
  () => subTaskChosen.value,
  (chosen) => {
    if (chosen) {
      taskStore.fetchTasks({ 'from-department-id': props.fromDepartmentId })
    }
  },
  { immediate: true },
)
</script>
<template>
  <div class="text-left p-4">
    <div class="flex items-center gap-6 justify-center my-10">
      <button @click.prevent="emit('parentIdSelect', 0)" class="btn-3">Add as Main Task</button>
      <span>or</span>
      <button
        :class="{ 'btn-3': !subTaskChosen, 'btn-2': subTaskChosen }"
        @click.prevent="subTaskChosen = true"
      >
        Add as Sub Task
      </button>
    </div>
    <div class="border rounded-md" v-if="subTaskChosen">
      <div class="py-2 px-4 font-bold text-center border-b shadow">
        Click to select task or sub task
      </div>
      <div class="flex flex-col justify-start items-start min-h-28 max-h-[70vh] overflow-y-auto">
        <div v-for="task in taskStore.tasks" :key="task.id" class="w-full mb-2">
          <!-- Level 1 -->
          <button
            type="button"
            class="text-left text-base w-full bg-blue-50 px-2 hover:bg-blue-500 hover:text-white py-4 text-blue-500 font-semibold"
            @click.prevent="emit('parentIdSelect', task.id)"
          >
            {{ task.title }}
          </button>
          <div class="mt-[1px]">
            <div v-for="subTask in task.children_tasks || []" :key="subTask.id" class="border-b">
              <!-- Level 2 -->
              <button
                type="button"
                class="text-left text-sm w-full hover:bg-blue-500 hover:text-white py-2"
                @click.prevent="emit('parentIdSelect', subTask.id)"
              >
                <span class="text-gray-400">&mdash;</span>{{ subTask.title }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
