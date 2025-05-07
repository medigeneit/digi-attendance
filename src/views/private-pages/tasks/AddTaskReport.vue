<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/useTaskStore'
import { useTaskReportStore } from '@/stores/useTaskReportStore'

const title = ref('')
const durationHour = ref(0)
const reportDate = ref('')
const durationMinute = ref(0)

const store = useTaskReportStore()
const taskStore = useTaskStore()
const route = useRoute()
const router = useRouter()

const taskId = route.params.id

onMounted(async () => {
  //await taskStore.fetchTask(taskId)
})

const submitForm = async () => {
  const duration = durationHour.value * 60 + durationMinute.value

  const payload = {
    title: title.value,
    report_date: reportDate.value,
    duration,
    task_id: taskId, // replace with actual task_id
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
</script>

<template>
  <div class="mt-6">
    <div class="bg-white border p-4 rounded">
      <form @submit.prevent="submitForm" class="grid gap-4 grid-cols-4">
        <div class="col-span-full text-red-800 font-semibold">{{ store?.error }}</div>

        <div class="col-span-full">
          Add Report on <span class="font-semibold">{{ taskStore.task?.title }}</span>
        </div>

        <div class="col-span-full">
          <label for="title" class="block">Title</label>
          <input
            id="title"
            v-model="title"
            type="text"
            class="border rounded p-2 w-full"
            placeholder="Enter report title"
          />
        </div>

        <div class="col-span-2">
          <label for="report_date">Report Date</label>
          <input
            v-model="reportDate"
            id="report_date"
            type="date"
            class="border rounded p-2 w-full"
          />
        </div>

        <div class="flex space-x-4 col-span-2">
          <div class="flex-1">
            <label for="durationHour" class="block">Duration (Hours)</label>
            <input
              id="durationHour"
              v-model.number="durationHour"
              type="number"
              min="0"
              class="border rounded p-2 w-full"
            />
          </div>

          <div class="flex-1">
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

        <hr class="col-span-full mb-2 mt-3 border-dashed" />

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
