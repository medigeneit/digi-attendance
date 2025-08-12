<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { getDisplayDate } from '@/libs/datetime'
import { useTaskReportStore } from '@/stores/useTaskReportStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const store = useTaskReportStore()
const taskStore = useTaskStore()
const route = useRoute()

const taskId = route.params.id

onMounted(async () => {
  await taskStore.fetchTask(taskId)
  await store.fetchTaskReports({ task_id: taskId })
})

function collectLeafReports(tasks, parentChain = []) {
  const reports = []

  for (const task of tasks) {
    const newChain = [...parentChain, task.title]

    if (task.children_tasks.length === 0) {
      // Leaf task: include its report and full parent chain (excluding itself)
      reports.push(
        ...task.reports.map((report) => {
          return {
            ...report,
            task_id: task.id,
            task_title: task.title,
            task_parents: parentChain,
            user: task.users.find((user) => user.id === report.user_id),
          }
        }),
      )
    } else {
      // Traverse children
      reports.push(...collectLeafReports(task.children_tasks, newChain))
    }
  }

  return reports
}

function sortByReportDate(reportA, reportB) {
  try {
    const timeA = new Date(reportA.report_date).getTime()
    const timeB = new Date(reportB.report_date).getTime()
    if (timeB === timeA) {
      return reportB.id - reportA.id
    }
    return timeB - timeA // descending order
  } catch (err) {
    return -1
  }
}

const taskReports = computed(() => {
  if (taskStore.task.children_task_count === 0) {
    return [...store.task_reports].sort(sortByReportDate)
  }

  return [...collectLeafReports(taskStore.tasks)].sort(sortByReportDate)
})
</script>

<template>
  <div class="mt-4">
    <hr class="mb-2" />

    <!-- <pre>{{ taskStore.tasks }}</pre> -->
    <div class="bg-white">
      <pre>{{ usersTaskProgress }}</pre>

      <div class="flex mb-2 items-end">
        <h3 class="text-sm font-semibold text-gray-600 uppercase mt-4">Task Reports</h3>

        <RouterLink
          v-if="taskStore.task?.children_task_count === 0 && !taskStore.task?.closed_at"
          :to="{
            name: 'TaskReportAdd',
            params: { id: taskStore.task?.id },
          }"
          @click="$event.stopPropagation()"
          class="btn-3 ml-auto inline-flex !my-1"
          >Add Report</RouterLink
        >
      </div>
      <div class="overflow-auto w-full">
        <table v-if="!store.loading" class="min-w-full bg-white shadow rounded-lg overflow-hidden">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-left w-2 border">#</th>
              <th
                class="px-4 py-2 text-left md:w-[100px] lg:w-[220px] xl:w-[320px] border"
                v-if="taskStore.task.children_task_count > 0"
              >
                Task
              </th>
              <th class="px-4 py-2 text-left lg:w-[540px] border">User Report</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="taskReports?.length === 0">
              <td class="px-4 py-4 font-medium text-gray-500 text-center border h-28" colspan="10">
                <div>NO REPORTS</div>
                <div>
                  <RouterLink
                    v-if="taskStore.task?.children_task_count === 0 && !taskStore.task?.closed_at"
                    :to="{
                      name: 'TaskReportAdd',
                      params: { id: taskStore.task?.id },
                    }"
                    @click="$event.stopPropagation()"
                    class="btn-3 ml-auto inline-flex !my-1"
                    >Add Report</RouterLink
                  >
                </div>
              </td>
            </tr>

            <tr
              v-for="(task_report, index) in taskReports"
              :key="task_report.id"
              class="border-t hover:bg-gray-50 cursor-pointer"
              @click.prevent="goToShow(task_report.id)"
              role="button"
            >
              <td class="px-4 py-2 border-b">{{ index + 1 }}</td>

              <td
                class="px-4 py-2 font-medium border-r border-b"
                v-if="taskStore.task.children_task_count > 0"
              >
                <div>
                  <div
                    v-for="(parentTaskTitle, index) in task_report.task_parents.reverse()"
                    class="text-gray-400 text-sm line-clamp-1"
                    :key="index"
                    :class="{ '-ml-1': index == 0 }"
                  >
                    <span style="font-family: monospace" v-if="index > 0">↳</span>
                    <span class="ml-1"> {{ parentTaskTitle }} </span>
                  </div>

                  <div>
                    <span
                      v-if="task_report.task_parents?.length > 0"
                      style="font-family: monospace"
                      :class="{
                        'ml-2': task_report.task_parents?.length == 1,
                        'ml-4': task_report.task_parents?.length == 2,
                        'ml-6': task_report.task_parents?.length == 3,
                        'ml-8': task_report.task_parents?.length == 4,
                      }"
                      >↳</span
                    >
                    <span class="ml-1">
                      {{ task_report.task_title }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="font-medium py-2 px-4 border">
                <div class="border rounded-md bg-gray-50">
                  <UserChip :user="task_report.user" class="inline-block w-full !rounded-sm" />
                  <div class="text-sm flex items-center px-3 py-3">
                    <div>
                      {{ task_report.title }}
                    </div>

                    <div class="text-gray-600 text-sm ml-auto whitespace-nowrap">
                      on {{ getDisplayDate(task_report.report_date) }}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="text-center border py-4 text-gray-500">Loading...</div>
      </div>
    </div>
  </div>
</template>
