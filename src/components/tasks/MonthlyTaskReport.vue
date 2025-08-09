<script setup>
import { getAllTaskReports } from '@/services/task-reports'
import { onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  year: { type: Number, default: null },
  month: { type: Number, default: null },
})

const selected = reactive({ month: null, year: null })
const reports = ref([])
const state = ref('')
const error = ref('')

async function fetchTaskReports(year, month) {
  selected.month = month
  selected.year = year
  state.value = 'loading'
  reports.value = (await getAllTaskReports(`${year}-${month}`))?.data?.reports || []
  state.value = ''
}

onMounted(() => {
  fetchTaskReports(props.year, props.month)
})

watch(
  () => [props.year, props.month],
  (yearMonth) => {
    const [year, month] = yearMonth
    fetchTaskReports(year, month)
  },
)
</script>

<template>
  <div class="border">
    <div class="bg-white shadow-md rounded-lg p-6">
      <div v-if="state == 'loading'" class="text-center py-4 text-gray-500">Loading Reports...</div>

      <div v-else-if="error" class="text-center py-4 text-red-500">
        {{ error }}
      </div>

      <div v-else class="overflow-x-auto w-full">
        <table class="min-w-full bg-white border overflow-hidden table table-fixed">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-left whitespace-nowrap">#</th>
              <th class="px-4 py-2 text-left whitespace-nowrap">Title</th>
              <th class="px-4 py-2 text-center whitespace-nowrap">Report Date</th>
              <th class="px-4 py-2 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(report, serial) in reports"
              :key="report.id"
              class="border-t hover:bg-blue-50 odd:bg-gray-50"
            >
              <td class="px-4 py-2">{{ serial + 1 }}</td>
              <td class="px-4 py-2">{{ report.title }}</td>

              <td class="px-4 py-2 text-center whitespace-nowrap">
                <div class="text-gray-600">
                  {{
                    new Date(report.report_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                </div>
              </td>

              <td class="px-4 py-2 text-center">
                <div class="flex gap-4 items-center justify-center"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
