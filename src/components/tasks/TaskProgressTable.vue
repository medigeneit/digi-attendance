<script setup lang="ts">
import type { Task } from '@/interfaces/task'
import type { TaskUser, TaskUserWithProgress } from '@/interfaces/user'
import { getDisplayDate } from '@/libs/datetime'
import UserChip from '../user/UserChip.vue'

const props = defineProps<{
  progressUsers: TaskUserWithProgress[]
  taskUsers: TaskUser[]
  task: Task
  tasks: Task[]
}>()
</script>

<template>
  <table class="min-w-full bg-white rounded overflow-hidden">
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
        <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-center">Progress</th>
        <!-- 
          <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-center">
            User Progress
          </th>
          <th class="px-2 py-1 border-y font-semibold text-xs uppercase text-center">
            Task Progress
          </th> 
        -->
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(progressUser, index) in progressUsers"
        :key="progressUser.id"
        class="border-t hover:bg-gray-50 cursor-pointer"
      >
        <td class="px-2 py-1 border-y">{{ index + 1 }}</td>

        <td class="px-2 py-1 border-y">
          <UserChip :user="progressUser" />
        </td>

        <td class="px-2 py-1 border-y text-center">
          {{ getDisplayDate(progressUser.started_at) }}
        </td>

        <td class="px-2 py-1 border-y text-center">
          {{ getDisplayDate(progressUser.finished_at) }}
        </td>

        <td class="px-2 py-1 border-y text-center">
          {{ getDisplayDate(progressUser.finished_at) }}
        </td>

        <!-- 
          <td class="px-2 py-1 border-y text-center">{{ progressUser.user_progress }}%</td>
          <td class="px-2 py-1 border-y text-center">{{ progressUser.task_progress }}%</td> 
        -->
      </tr>
    </tbody>
  </table>
</template>
