<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useShortLeaveStore } from '@/stores/short-leave'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const shortLeaveStore = useShortLeaveStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const selectUser = ref(null)
const today = new Date().toISOString().split('T')[0]
const { type, start_time, end_time } = route.query

const todayDate = new Date().toISOString().split('T')[0]

const form = ref({
  date: todayDate,
  date: '',
  start_time: '',
  end_time: '',
  reason: '',
  works_in_hand: '',
  handover_user_id: '',
  type: '',
})

form.value.handover_user_id = computed(() => selectUser.value?.id) // id পাওয়ার জন্য computed property

const loading = ref(false)
const error = ref(null)

// Computed property to calculate duration in minutes
const durationInMinutes = computed(() => {
  if (form.value.start_time && form.value.end_time) {
    const startTime = new Date(`1970-01-01T${form.value.start_time}:00`)
    const endTime = new Date(`1970-01-01T${form.value.end_time}:00`)
    const diffInMs = endTime - startTime
    return Math.round(diffInMs / (1000 * 60)) // Convert milliseconds to minutes
  }
  return 0
})

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
  userStore.fetchHandoverDepartmentWiseEmployees()

  form.value.date = formatDate(
    type === 'Delay' ? start_time : type === 'Early' ? end_time : todayDate,
  )

  form.value.type = type || ''
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
        <input
          type="date"
          id="date"
          v-model="form.date"
          :max="today"
          class="input-1 w-full"
          required
        />
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

      <!-- <div>
        <label for="start-time" class="block text-sm font-medium">Time</label>
        <input
          type="time"
          id="start-time"
          v-model="form.start_time"
          class="input-1 w-full"
          required
        />
      </div> -->
      <div class="col-span-2 grid grid-cols-2 gap-4">
        <div>
          <label for="start-time" class="block text-sm font-medium">From</label>
          <input
            type="time"
            id="start-time"
            v-model="form.start_time"
            class="input-1 w-full"
            required
          />
        </div>

        <div>
          <label for="end-time" class="block text-sm font-medium">To</label>
          <input
            type="time"
            id="end-time"
            v-model="form.end_time"
            class="input-1 w-full"
            required
          />
        </div>
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
          :options="userStore.handoverUsers"
          :multiple="false"
          :required="false"
          label="name"
          placeholder="Select user"
        />
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
