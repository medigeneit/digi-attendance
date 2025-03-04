<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useShortLeaveStore } from '@/stores/short-leave'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const shortLeaveStore = useShortLeaveStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const shift = ref(null)
const selectUser = ref('')
const { type, start_time, end_time } = route.query

const entry_time = ref('')
const exit_time = ref('')

const todayDate = new Date().toISOString().split('T')[0]

const form = ref({
  date: todayDate,
  time: '22:30',
  start_time: '',
  end_time: '',
  reason: '',
  works_in_hand: '',
  handover_user_id: '',
  total_minute: '',
  type: '',
})

const loading = ref(false)

const error = ref(null)

watch(
  () => form.value.date,
  async (newValue) => {
    fetchAttendance()
  },
)
watch(
  () => selectUser.value,
  (newValue) => {
    form.value.handover_user_id = newValue?.id
  },
)

// Computed property to calculate duration in minutes
const durationInMinutes = computed(() => {
  if (!form.value.start_time || !shift.value.start_time) return 0

  // Convert HH:mm:ss to JavaScript Date Object
  const parseTime = (time) => new Date(`1970-01-01T${time}`)

  const startTime = parseTime(form.value.start_time)
  const endTime = form.value.end_time ? parseTime(form.value.end_time) : null
  const shiftStart = parseTime(shift.value.start_time)
  const shiftEnd = parseTime(shift.value.end_time)

  let duration = 0

  if (form.value.type === 'Delay') {
    duration = (startTime - shiftStart) / (1000 * 60) // Convert ms to minutes
  } else if (form.value.type === 'Early') {
    duration = (shiftEnd - startTime) / (1000 * 60) // Shift End - Start Time
  } else if (endTime) {
    duration = (endTime - startTime) / (1000 * 60) // End Time - Start Time
  }

  return Math.round(duration)
})

watch(
  () => form.value.type,
  (newType) => {
    if (!entry_time.value && !exit_time.value) return

    const extractTime = (datetime) =>
    datetime && datetime.includes(" ") ? datetime.split(" ")[1].substring(0, 5) : "";

    if (newType === 'Delay' && entry_time.value) {
      form.value.start_time = extractTime(entry_time.value) // Only assign time
    } else if (newType === 'Early' && exit_time.value) {
      // FIXED `elseif` to `else if`
      form.value.start_time = extractTime(exit_time.value) // Only assign time
    } else {
      form.value.start_time = '' // Reset when type is changed to something else
    }
  },
)

watch(
  () => [form.value.start_time, form.value.end_time, form.value.type],
  () => {
    form.value.total_minute = durationInMinutes.value
  },
)

// Watch durationInMinutes to show/hide handover user selection
const showHandoverUser = computed(() => durationInMinutes.value > 30)

const submitShortLeave = async () => {
  loading.value = true
  error.value = null

  try {
    const payload = {
      user_id: authStore?.user?.id,
      ...form.value,
    }
    const newShortLeave = await shortLeaveStore.createShortLeave(payload)

    router.push({ name: 'ShortLeaveShow', params: { id: newShortLeave.id } })
  } catch (err) {
    error.value = err.message || 'Failed to submit short leave application'
  } finally {
    loading.value = false
  }
}
const fetchAttendance = async () => {
  loading.value = true
  error.value = null

  try {
    const payload = {
      date: form.value.date,
    }
    const response = await shortLeaveStore.fetchCreateShortLeaveData(payload)
    shift.value = response?.shift
    entry_time.value = response?.entry_time
    exit_time.value = response?.exit_time
  } catch (err) {
    error.value = err.message || 'Failed to submit short leave application'
  } finally {
    loading.value = false
  }
}

const formatDate = (datetime) => {
  if (!datetime) return todayDate

  return datetime.split(' ')[0]
}

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

onMounted(() => {
  fetchAttendance()
  userStore.fetchDepartmentWiseEmployees()
  form.value.date = formatDate(type === 'Delay' ? time : type === 'Early' ? time : todayDate)
  form.value.date = formatDate(
    type === 'Delay' ? start_time : type === 'Early' ? end_time : todayDate,
  )

  form.value.type = type || ''
  form.value.time = start_time ? formatTime(start_time) : '22:30'
  form.value.start_time = formatTime(start_time) || ''
  form.value.end_time = formatTime(end_time) || ''
})

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

      <h1 class="title-lg flex-wrap text-center">Short Leave Application Form</h1>
      <div>
        <RouterLink to="/my-applications" class="btn-2">Home</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submitShortLeave" class="space-y-4 card-bg md:p-8 p-4">
      <div>
        <label for="date" class="block text-sm font-medium">Date</label>
        <input type="date" id="date" v-model="form.date" class="input-1 w-full" required />
      </div>

      <!-- Type Field -->
      <div>
        <label for="type" class="block text-sm font-medium">Type</label>
        <select id="type" v-model="form.type" class="input-1 w-full" required>
          <option value="">Select Type</option>
          <option value="Delay">Delay</option>
          <option value="OfficeTime">Office Time</option>
          <option value="Early">Early</option>
        </select>
      </div>

      <div v-if="form.type !== 'OfficeTime'">
        <label for="start-time" class="block text-sm font-medium">Time</label>
        <input
          type="time"
          id="start-time"
          v-model="form.start_time"
          class="input-1 w-full"
          required
        />
      </div>

      <div v-if="form.type === 'OfficeTime'">
        <label for="start-time" class="block text-sm font-medium">Start Time</label>
        <input
          type="time"
          id="start-time"
          v-model="form.start_time"
          class="input-1 w-full"
          required
        />
      </div>

      <div v-if="form.type === 'OfficeTime'">
        <label for="end-time" class="block text-sm font-medium">End Time</label>
        <input type="time" id="end-time" v-model="form.end_time" class="input-1 w-full" required />
      </div>

      <div>
        <label for="reason" class="block text-sm font-medium">Reason</label>
        <textarea
          id="reason"
          v-model="form.reason"
          class="input-1 w-full"
          placeholder="Enter your reason for leave"
          required
        ></textarea>
      </div>

      <div v-if="showHandoverUser">
        <label for="works-in-hand" class="block text-sm font-medium">Works in Hand</label>
        <textarea
          id="works-in-hand"
          v-model="form.works_in_hand"
          class="input-1 w-full"
          placeholder="Enter details of works in hand"
        ></textarea>
      </div>

      <div v-if="showHandoverUser">
        <label for="handover-user" class="block text-sm font-medium">Handover User</label>
        <MultiselectDropdown
          v-model="selectUser"
          :options="userStore.users"
          :multiple="false"
          label="Select User"
          labelFor="user"
        />
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
