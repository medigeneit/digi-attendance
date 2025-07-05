<script setup lang="ts">
import type { TaskWithChildren } from '@/interfaces/task'
import { getDisplayDate } from '@/libs/datetime'
import { getSubTasksProgressUsers, getTaskProgressUsers } from '@/libs/task-progress'
import { computed } from 'vue'
import UserChip from '../user/UserChip.vue'

const props = defineProps<{
  task: TaskWithChildren
  subTasks: TaskWithChildren[]
}>()

const taskProgressUsers = computed(() =>
  getTaskProgressUsers(props.task.users, props.task.task_reports || []),
)

const subTaskProgressUsers = computed(() =>
  getSubTasksProgressUsers(props.task.users, props.subTasks),
)
</script>

<template>
  <table
    v-if="props.task.children_task_count > 0"
    class="min-w-full bg-white rounded overflow-hidden"
  >
    <caption class="py-0.5 text-bg font-semibold">
      <slot name="caption">Progress</slot>
    </caption>
    <thead class="bg-gray-50">
      <tr>
        <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-left">#</th>
        <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-left lg:w-[200px]">
          User
        </th>

        <th
          v-for="row in (subTaskProgressUsers[0] || {})?.sub_task_infos?.length || 1"
          :key="row"
          class="px-2 py-1 border-y font-semibold text-xs uppercase text-center"
        >
          {{ row === 1 ? 'Completed Sub Task' : '' }}
          {{ row === 2 ? 'Completed Sub Sub Task' : '' }}
          {{ row === 3 ? 'Completed Sub Sub Sub Task' : '' }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(progressUser, index) in subTaskProgressUsers"
        :key="progressUser.id"
        class="border-t hover:bg-gray-50 cursor-pointer"
      >
        <td class="px-2 py-1 border-y">{{ index + 1 }}</td>
        <td class="px-2 py-1 border-y">
          <UserChip :user="progressUser" />
        </td>

        <td
          v-for="(subTaskInfo, index) in progressUser.sub_task_infos"
          class="px-2 py-1 border-y text-center"
          :key="index"
        >
          <div
            v-if="subTaskInfo.total_assigned === 0 || !progressUser.assigned_on_any_leaf_task"
            class="text-sm text-gray-400"
          >
            Not Assigned To Any Task
          </div>
          <div v-else>{{ subTaskInfo.completed_count }} / {{ subTaskInfo.total_assigned }}</div>
        </td>
      </tr>
    </tbody>
  </table>

  <table v-else class="min-w-full bg-white rounded overflow-hidden">
    <caption class="py-0.5 text-bg font-semibold">
      <slot name="caption">Progress</slot>
    </caption>
    <thead class="bg-gray-50">
      <tr>
        <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-left">#</th>
        <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-left lg:w-[200px]">
          User
        </th>
        <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-center">Started</th>
        <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-center">Finished</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(progressUser, index) in taskProgressUsers"
        :key="progressUser.id"
        class="border-t hover:bg-gray-50 cursor-pointer"
      >
        <td class="px-2 py-1 border-y">{{ index + 1 }}</td>
        <td class="px-2 py-1 border-y">
          <UserChip :user="progressUser" />
        </td>
        <td class="px-2 py-1 border-y text-center">
          {{ getDisplayDate(progressUser.task_started_at) }}
        </td>
        <td class="px-2 py-1 border-y text-center">
          {{ getDisplayDate(progressUser.task_finished_at) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
