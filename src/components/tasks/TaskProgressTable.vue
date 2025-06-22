<script setup lang="ts">
import type { TaskUserWithProgress } from '@/interfaces/user'
import UserChip from '../user/UserChip.vue'

const props = defineProps<{
  progressUsers: TaskUserWithProgress[]
}>()
</script>

<template>
  <table class="min-w-full bg-white shadow rounded-lg overflow-hidden">
    <caption class="border rounded-t-lg py-0.5 px-4 text-bg font-semibold">
      Progress
    </caption>
    <thead class="bg-gray-100">
      <tr>
        <th class="px-4 py-2 text-left">#</th>
        <th class="px-4 py-2 text-left lg:w-[200px]">User</th>
        <th class="px-4 py-2 text-center">User Progress</th>
        <th class="px-4 py-2 text-center">Task Progress</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(progressUser, index) in progressUsers"
        :key="progressUser.id"
        class="border-t hover:bg-gray-50 cursor-pointer"
      >
        <td class="px-4 py-2">{{ index + 1 }}</td>
        <td class="px-4 py-2">
          <UserChip :user="progressUser" />
        </td>
        <td class="px-4 py-2 text-center">{{ progressUser.user_progress }}%</td>
        <td class="px-4 py-2 text-center">{{ progressUser.task_progress }}%</td>
      </tr>
    </tbody>
  </table>
</template>
