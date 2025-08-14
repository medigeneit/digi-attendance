<script setup>
import TaskAssignedUsers from './TaskAssignedUsers.vue'

const props = defineProps({
  treeLevel: { type: Number, required: true },
  task: { type: Object, required: true },
  employeeRouteTo: { type: Function, default: null },
})
</script>

<template>
  <div
    class="col-span-full flex flex-col md:flex-row items-stretched my-4 lg:my-0 justify-start gap-x-5 gap-y-4"
  >
    <div
      class="flex flex-col items-start justify-start gap-2 border-gray-200 bg-gray-50/40 p-1 px-3"
    >
      <template v-if="treeLevel === 0">
        <div
          class="text-xs px-2 py-0.5 rounded-full border bg-sky-500/80 text-white line-clamp-1 text-center"
          :class="{ '': task?.from_department?.name }"
          :title="task?.from_department?.name || '--'"
        >
          {{ task?.from_department?.name || '--' }}
        </div>
      </template>
      <TaskAssignedUsers
        class="flex items-center justify-center flex-wrap gap-x-3 gap-y-2"
        :users="task.supervisors || []"
        listType="supervisors"
        :maxItem="1"
      />
    </div>

    <div>
      <span class="flex md:hidden text-2xl text-gray-200 items-center justify-center h-full">
        <i class="fad fa-arrow-down"></i>
      </span>
      <span class="hidden md:flex text-2xl text-gray-200 items-center justify-center h-full">
        <i class="fad fa-arrow-right"></i>
      </span>
    </div>

    <div class="flex flex-col items-start justify-start gap-2 py-1 px-3">
      <template v-if="treeLevel === 0">
        <div
          class="text-xs px-2 py-0.5 rounded-full border bg-sky-500/80 text-white line-clamp-1 text-center"
          :class="{ '': task?.to_department?.name }"
          :title="task?.to_department?.name || '--'"
        >
          {{ task?.to_department?.name || '--' }}
        </div>
      </template>

      <TaskAssignedUsers
        class="flex items-center justify-center gap-x-3 gap-y-2"
        :users="task.users || []"
        :isTargetTask="task.is_target"
        :routeTo="employeeRouteTo"
        :maxItem="1"
      />
    </div>
  </div>
</template>
