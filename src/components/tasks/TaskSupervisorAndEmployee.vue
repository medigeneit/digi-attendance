<script setup>
import TaskAssignedUsers from './TaskAssignedUsers.vue'

const props = defineProps({
  treeLevel: { type: Number, required: true },
  task: { type: Object, required: true },
  employeeRouteTo: { type: Function, default: () => null },
})
</script>

<template>
  <div
    class="col-span-full flex flex-col md:flex-row items-stretched my-2 lg:my-0 justify-center flex-wrap gap-x-1 gap-y-4"
  >
    <div
      class="flex flex-col items-center justify-center gap-2 border border-dashed border-blue-100 rounded shadow shadow-blue-50 bg-sky-50 p-3"
    >
      <template v-if="treeLevel === 0">
        <div class="text-xs px-2 py-0.5 rounded-full border bg-sky-500 text-white">
          {{ task?.from_department?.name || '--' }}
        </div>
      </template>
      <TaskAssignedUsers
        class="flex items-center justify-center flex-wrap gap-x-3"
        :users="task.supervisors || []"
        listType="supervisors"
      />
    </div>

    <div>
      <span class="flex md:hidden text-2xl text-gray-200 items-center justify-center h-full">
        <i class="fas fa-arrow-alt-down"></i>
      </span>
      <span class="hidden md:flex text-2xl text-gray-200 items-center justify-center h-full">
        <i class="fas fa-arrow-alt-right"></i>
      </span>
    </div>

    <div
      class="flex flex-col items-center justify-center gap-2 border border-dashed border-blue-100 rounded shadow shadow-blue-50 bg-sky-50 p-3"
    >
      <template v-if="treeLevel === 0">
        <div class="text-xs px-2 py-0.5 rounded-full border bg-blue-500 text-white">
          {{ task?.to_department?.name || '--' }}
        </div>
      </template>

      <TaskAssignedUsers
        class="flex items-center justify-center flex-wrap gap-x-3"
        :users="task.users || []"
        :isTargetTask="task.is_target"
        :routeTo="employeeRouteTo"
      />
    </div>
  </div>
</template>
