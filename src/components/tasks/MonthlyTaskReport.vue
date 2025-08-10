<script setup>
import { getDateRangeArray, getYearMonthDayFormat } from '@/libs/datetime'
import { getMyTaskReports } from '@/services/task-reports'
import { onMounted, ref, watch } from 'vue'
import LoaderView from '../common/LoaderView.vue'

const props = defineProps({
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
})

const reports = ref([])
const state = ref('')
const error = ref('')

const outputStartDate = ref('')
const outputEndDate = ref('')

async function fetchTaskReports() {
  if (props.startDate || props.endDate) {
    try {
      state.value = 'loading'
      const responseData =
        (
          await getMyTaskReports({
            start_date: props.startDate,
            end_date: props.endDate,
          })
        )?.data || {}

      outputStartDate.value = responseData.start
      outputEndDate.value = responseData.end
      reports.value = responseData.reports || []
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed load task report'
    } finally {
      state.value = ''
    }
  }
}

onMounted(() => {
  fetchTaskReports()
})

watch(
  () => [props.startDate, props.endDate],
  () => {
    fetchTaskReports()
  },
)

function getReportsOnDay(date) {
  return reports.value.filter((report) => {
    return getYearMonthDayFormat(date) == report.report_date
  })
}
</script>

<template>
  <div class="relative">
    <div class="mb-2 text-center text-sm">
      Task Report from <span class="text-blue-500">{{ outputStartDate }}</span> to
      <span class="text-blue-500">{{ outputEndDate }}</span>
    </div>
    <div v-if="error" class="text-center py-4 text-red-500">
      {{ error }}
    </div>
    <div class="overflow-x-auto w-full">
      <table class="min-w-full bg-white border overflow-hidden table table-fixed">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2 text-center whitespace-nowrap w-32">Report Date</th>
            <th class="px-4 py-2 text-left whitespace-nowrap">Task</th>
            <th class="px-4 py-2 text-left whitespace-nowrap">Report</th>
            <th class="px-4 py-2 text-center whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="date in getDateRangeArray(startDate, endDate)" :key="date">
            <tr>
              <td
                class="px-4 py-2 text-center whitespace-nowrap border"
                :rowspan="getReportsOnDay(date).length + 1"
              >
                <div class="text-gray-800 text-sm">
                  {{
                    new Date(date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                </div>
              </td>

              <td
                v-if="getReportsOnDay(date).length === 0"
                colspan="20"
                class="border text-center text-gray-300 text-sm"
              >
                No Report Provided
              </td>
            </tr>

            <template v-if="getReportsOnDay(date).length">
              <tr v-for="report in getReportsOnDay(date)" :key="report.id" class="border-t">
                <td class="px-4 py-2 border-r">
                  <!-- Main task -->
                  <div :class="{ 'text-gray-500 text-xs': report?.task?.parent?.parent?.title }">
                    {{ report?.task?.parent?.parent?.title }}
                  </div>

                  <!-- Sub Task -->
                  <div :class="{ 'text-gray-500 text-xs': report?.task?.parent?.title }">
                    <span v-if="report?.task?.parent?.parent?.title" style="font-family: monospace"
                      >-</span
                    >
                    {{ report?.task?.parent?.title }}
                  </div>

                  <!-- Sub Sub Task -->
                  <div>
                    <span v-if="report?.task?.parent?.title" style="font-family: monospace"
                      >--</span
                    >
                    {{ report?.task?.title }}
                  </div>
                </td>

                <td class="px-4 py-2">{{ report.title }}</td>
                <td class="px-4 py-2 text-center">
                  <div class="flex gap-4 items-center justify-center"></div>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <LoaderView
      class="absolute inset-0 flex items-center justify-center z-20 bg-opacity-70"
      v-if="state === 'loading'"
    />
  </div>
</template>
