<script setup>
import { useTaskReportStore } from '@/stores/useTaskReportStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskReportStore()
const taskStore = useTaskStore()
const route = useRoute()
const router = useRouter()

const taskId = route.params.id

onMounted(async () => {
  await store.fetchTaskReports({ task_id: taskId })
})
</script>

<template>
  <div class="mt-4">
    <hr class="mb-2" />
    <div class="bg-white">
      <div class="flex mb-2 items-end">
        <h3 class="text-sm uppercase mt-4">Task Reports</h3>
        <RouterLink
          :to="{
            name: 'TaskReportAdd',
            params: { todoable_id: store.task?.id },
            query: { todoable_type: 'task' },
          }"
          @click="$event.stopPropagation()"
          class="btn-3 ml-auto inline-flex !my-1"
          >Add Report</RouterLink
        >
      </div>
      <table v-if="!store.loading" class="min-w-full bg-white shadow rounded-lg overflow-hidden">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2 text-left">#</th>
            <th class="px-4 py-2 text-left">Title</th>
            <th class="px-4 py-2 text-left">Date</th>
            <th class="px-4 py-2 text-left">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.task_reports?.length === 0">
            <td class="px-4 py-4 font-medium text-gray-500 text-center" colspan="10">NO REPORTS</td>
          </tr>
          <tr
            v-for="(task_report, index) in store.task_reports"
            :key="task_report.id"
            class="border-t hover:bg-gray-50 cursor-pointer"
            @click.prevent="goToShow(task_report.id)"
            role="button"
          >
            <td class="px-4 py-2">{{ index + 1 }}</td>
            <td class="px-4 py-2 font-medium">{{ task_report.title }}</td>
            <td class="px-4 py-2 font-medium">{{ task_report.report_date }}</td>
            <td class="px-4 py-2 font-medium">
              {{ task_report.duration_hour }} h {{ task_report.duration_minute }} m
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-center border py-4 text-gray-500">Loading...</div>
    </div>
  </div>
</template>
