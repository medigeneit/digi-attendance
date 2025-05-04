<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const manualAttendanceStore = useManualAttendanceStore()
const authStore = useAuthStore()

const formatTime = (timeStr) => {
  if (!timeStr) return null
  const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!timeParts) return null
  let [_, hours, minutes, period] = timeParts
  hours = parseInt(hours, 10)
  if (period.toUpperCase() === 'PM' && hours < 12) hours += 12
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0
  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

const { date, type, entry_time, exit_time } = router.currentRoute.value.query

const todayDate = date ? date : new Date().toISOString().split('T')[0]

const form = reactive({
  date: todayDate,
  type: type || '',
  check_in: entry_time ? formatTime(entry_time) : '',
  check_out: exit_time ? formatTime(exit_time) : '',
  description: '',
  punch_type: '',
})

watch(
  () => form.type,
  (newType) => {
    console.log(newType)

    if (newType !== 'Forget Punch') {
      form.punch_type = ''
    }
  },
)

const loading = ref(false)
const error = ref(null)

const submitManualAttendance = async () => {
  loading.value = true
  error.value = null

  try {
    const payload = {
      user_id: authStore?.user?.id,
      ...form,
      check_in: form.check_in ? `${form.date} ${form.check_in}:00` : null,
      check_out: form.check_out ? `${form.date} ${form.check_out}:00` : null,
    }
    const newAttendance = await manualAttendanceStore.createManualAttendance(payload)

    router.push({ name: 'ManualAttendanceShow', params: { id: newAttendance.id } })
  } catch (err) {
    error.value = err.message || 'Failed to submit manual attendance request.'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Manual Attendance Request Form</h1>
      <div>
        <RouterLink to="/" class="btn-2">Home</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submitManualAttendance" class="space-y-4 card-bg md:p-8 p-4">
      <div>
        <label for="date" class="block text-sm font-medium">Date</label>
        <input type="date" id="date" v-model="form.date" class="input-1 w-full" required />
      </div>

      <div>
        <label for="type" class="block text-sm font-medium">Type</label>
        <select id="type" v-model="form.type" class="input-1 w-full" required>
          <option value="">Select Type</option>
          <option value="Home Office">Home Office</option>
          <option value="Remote Work">Remote Work</option>
          <option value="Forget Punch">Forget Punch</option>
        </select>
      </div>

      <div v-if="form.type === 'Forget Punch'">
        <label for="type" class="block text-sm font-medium">Forget Punch Type</label>
        <select id="type" v-model="form.punch_type" class="input-1 w-full" required>
          <option value="">Select One</option>
          <option value="entry">Entry</option>
          <option value="exit">Exit</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div v-if="form.type !== 'Forget Punch' || form.punch_type === 'both'">
        <label for="check-in" class="block text-sm font-medium">Check-In</label>
        <input type="time" id="check-in" v-model="form.check_in" class="input-1 w-full" />
      </div>

      <div v-if="form.type !== 'Forget Punch' || form.punch_type === 'both'">
        <label for="check-out" class="block text-sm font-medium">Check-Out</label>
        <input type="time" id="check-out" v-model="form.check_out" class="input-1 w-full" />
      </div>

      <div v-if="form.type === 'Forget Punch' && form.punch_type === 'entry'">
        <label for="check-in" class="block text-sm font-medium">Check-In</label>
        <input type="time" id="check-in" v-model="form.check_in" class="input-1 w-full" />
      </div>

      <div v-if="form.type === 'Forget Punch' && form.punch_type === 'exit'">
        <label for="check-out" class="block text-sm font-medium">Check-Out</label>
        <input type="time" id="check-out" v-model="form.check_out" class="input-1 w-full" />
      </div>

      <div>
        <label for="description" class="block text-sm font-medium">Description</label>
        <textarea
          id="description"
          v-model="form.description"
          class="input-1 w-full"
          placeholder="Enter a description of the reason for manual attendance"
          required
        ></textarea>
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
