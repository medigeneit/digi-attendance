<script setup>
import RequiredIcon from '@/components/RequiredIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { useTaskReportStore } from '@/stores/useTaskReportStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const store = useTaskReportStore()
const taskStore = useTaskStore()
const authStore = useAuthStore()

const taskId = route.params.id

const title = ref('')
const durationHour = ref(0)
const reportDate = ref(getDate())
const durationMinute = ref(0)
const progress = ref(0)
const formTaskId = ref('')
const status = ref('')

const router = useRouter()

onMounted(async () => {
  await taskStore.fetchTask(taskId)
  if (taskStore.task.children_task_count == 0) {
    status.value = taskStore.task.status
  }
})

function collectLeafTask(tasks, parentChain = []) {
  const reports = []

  for (const task of tasks) {
    const newChain = [...parentChain, task.title]

    if (task.children_tasks.length === 0) {
      if (task.users.some((user) => user.id == authStore.user?.id)) {
        reports.push({
          id: task.id,
          title: task.title,
          status: task.status,
          task_parents: parentChain,
          user_ids: task.users.map((user) => user.id),
        })
      }
    } else {
      reports.push(...collectLeafTask(task.children_tasks, newChain))
    }
  }

  return reports
}

const leafTasks = computed(() => {
  if (taskStore.task.children_task_count > 0) {
    return collectLeafTask(taskStore.tasks)
  }
  return []
})

const submitForm = async () => {
  const duration = durationHour.value * 60 + durationMinute.value

  const payload = {
    c_length: taskStore.task.children_task_count,
    task_id: taskStore.task.children_task_count > 0 ? formTaskId.value : taskStore.task?.id,
    title: title.value,
    report_date: reportDate.value,
    progress: progress.value,
    status: status.value,
    duration,
  }
  console.log({ payload })

  try {
    const response = await store.createTaskReport(payload)
    console.log('Submitted:', response.data)
    // reset form
    title.value = ''
    reportDate.value = ''
    durationHour.value = 0
    durationMinute.value = 0

    router.push({
      name: 'TaskReports',
      params: { id: taskId },
    })
  } catch (error) {
    console.error('Error submitting report:', error)
  }
}

function getDate() {
  const today = new Date()

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

watch(
  () => formTaskId.value,
  function () {
    const selectedTask = leafTasks.value.find((task) => task.id == formTaskId.value)
    console.log({ selectedTask })
    if (selectedTask) {
      status.value = selectedTask.status
    }
  },
)

const userCanReport = computed(() => {
  return (
    (taskStore.task.children_task_count > 0 && leafTasks.value.length > 0) ||
    (taskStore.task.children_task_count === 0 &&
      (taskStore.task?.users || []).some((user) => user.id == authStore.user?.id))
  )
})
</script>

<template>
  <div class="mt-6">
    <div class="max-w-xl w-full mx-auto bg-white border p-4 rounded-md shadow">
      <div class="col-span-full text-red-800 font-semibold">{{ store?.error }}</div>
      <div
        v-if="!userCanReport"
        class="w-full flex items-center justify-center h-40 text-red-500 text-xl text-center"
      >
        You Are Not Assigned to this task. <br />You cannot add a report.
      </div>

      <form v-else @submit.prevent="submitForm" class="grid gap-x-4 gap-y-6 grid-cols-4">
        <h2 class="text-2xl font-bold col-span-full border-b pb-1">Add Report</h2>
        <div class="col-span-full" v-if="taskStore.task.children_task_count === 0">
          Add Report on <span class="font-semibold">{{ taskStore.task?.title }}</span>
          <hr class="mt-1" />
        </div>

        <div class="col-span-full" v-else>
          <label class="block text-gray-600 text-sm mb-1 font-medium">
            Task <RequiredIcon />
          </label>
          <select
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            v-model="formTaskId"
          >
            <option value="">--select---</option>

            <option v-for="task in leafTasks" :key="task.id" class="w-full" :value="task.id">
              {{ task.title }}
              <template v-for="parentTitle in task.task_parents" :key="parentTitle">
                ↵ {{ parentTitle }}
              </template>
            </option>
          </select>
        </div>

        <div class="col-span-full">
          <label for="title" class="block text-gray-600 text-sm mb-1 font-medium"
            >Report <span class="text-gray-400">(optional)</span></label
          >
          <input
            id="title"
            v-model="title"
            type="text"
            class="border rounded p-2 w-full"
            placeholder="Enter report title"
          />
        </div>
        <!-- 
          <div class="col-span-full grid grid-cols-2">
            <div class="col-span-2">
              <label for="durationHour" class="block">Duration (Hours)</label>
              <input
              id="durationHour"
              v-model.number="durationHour"
              type="number"
              min="0"
              class="border rounded p-2 w-full"
              />
            </div>
            
            <div class="col-span-2">
              <label for="durationMinute" class="block">Duration (Minutes)</label>
              <input
              id="durationMinute"
              v-model.number="durationMinute"
              type="number"
              min="0"
              max="59"
              class="border rounded p-2 w-full"
              />
            </div> 
          </div>
        -->

        <!-- 
          <div class="col-span-2">
            <label for="durationMinute" class="block">Progress (%)</label>
            <input
              id="durationMinute"
              v-model.number="progress"
              type="number"
              min="0"
              max="100"
              class="border rounded p-2 w-full"
            />
          </div> 
        -->

        <div class="col-span-2">
          <label class="block text-gray-600 text-sm mb-1 font-medium">
            Status <RequiredIcon />
          </label>
          <select
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            v-model="status"
          >
            <option value="">--select---</option>
            <option>PENDING</option>
            <option>IN_PROGRESS</option>
            <option>COMPLETED</option>
            <option>BLOCKED</option>
            <option>CANCELLED</option>
            <option>BACK_LOG</option>
          </select>
        </div>
        <div class="col-span-2">
          <label for="report_date" class="block text-gray-600 text-sm mb-1 font-medium">
            Report Date <RequiredIcon />
          </label>
          <input
            v-model="reportDate"
            id="report_date"
            type="date"
            class="border rounded p-2 w-full"
          />
        </div>

        <hr class="col-span-full border-dashed" />

        <div class="flex justify-between col-span-full">
          <button type="submit" class="btn-2">Submit</button>
          <RouterLink
            type="submit"
            class="btn-3"
            :to="{
              name: 'TaskReports',
              params: { id: taskId },
            }"
            >Cancel</RouterLink
          >
        </div>
      </form>
    </div>
  </div>
</template>
