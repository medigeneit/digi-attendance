<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useHolidayStore } from '@/stores/holiday'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useLeaveTypeStore } from '@/stores/leave-type'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const leaveApplicationStore = useLeaveApplicationStore()
const router = useRouter()
const route = useRoute()
const leaveTypeStore = useLeaveTypeStore()
const userStore = useUserStore()
const holidayStore = useHolidayStore()
const leaveApplication = computed(() => leaveApplicationStore.leaveApplication)
const leaveApplicationId = computed(() => route.params.id)
const selectUser = ref(null)
const form = ref({
  user_id: '',
  last_working_date: '',
  resumption_date: '',
  reason: '',
  works_in_hand: '',
  handover_user_id: '',
  leave_days: [],
})

onMounted(async () => {
  const { id } = route.params
  try {
    await leaveApplicationStore.fetchLeaveApplicationById(id)

    const companyId = leaveApplicationStore.leaveApplication?.user?.company?.id

    if (companyId) {
      await leaveTypeStore.fetchLeaveTypes(companyId)
    }

    if (leaveApplicationStore.leaveApplication) {
      await userStore.fetchTypeWiseEmployees({
        type: leaveApplicationStore.leaveApplication.user.type,
        except: [leaveApplicationStore.leaveApplication.user.id],
      })
      if (userStore.users.length > 0) {
        const user = computed(
          () =>
            userStore.users.filter(
              (user) => user.id === leaveApplicationStore.leaveApplication?.handover_user_id,
            )[0] || {},
        )
        console.log('users', user.value)
        selectUser.value = user.value
      }
    }
    if (leaveApplicationStore.leaveApplication) {
      form.value.user_id = leaveApplicationStore.leaveApplication?.user_id
      form.value.last_working_date = leaveApplicationStore.leaveApplication?.last_working_date
      form.value.resumption_date = leaveApplicationStore.leaveApplication?.resumption_date
      form.value.reason = leaveApplicationStore.leaveApplication?.reason
      form.value.works_in_hand = leaveApplicationStore.leaveApplication?.works_in_hand
      form.value.handover_user_id = leaveApplicationStore.leaveApplication?.handover_user_id
      form.value.leave_days = leaveApplicationStore.leaveApplication?.leave_days
    }
  } catch (error) {
    console.error('Failed to load leave application:', error)
  } finally {
    loading.value = false
  }
})

const selectedLeaveTypes = ref([])
const loading = ref(false)
const error = ref(null)

const weekends = computed(() => {
  return authStore?.user?.assign_weekend?.weekends || authStore?.user?.weekends
})

const leaveDays = computed(() => {
  const startDateStr = form.value.last_working_date
  const endDateStr = form.value.resumption_date

  if (!startDateStr || !endDateStr) return []

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  if (end <= start) return []

  const days = []
  let current = new Date(start)
  current.setDate(current.getDate() + 1)

  while (current < end) {
    const yyyy = current.getFullYear()
    const mm = (current.getMonth() + 1).toString().padStart(2, '0')
    const dd = current.getDate().toString().padStart(2, '0')
    days.push(`${yyyy}-${mm}-${dd}`)
    current.setDate(current.getDate() + 1)
  }

  return days
})

const leaveDaysMessage = computed(() => {
  const startDateStr = form.value.last_working_date
  const endDateStr = form.value.resumption_date

  if (!startDateStr || !endDateStr) return ''

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  if (end <= start) {
    return 'Resumption date must be after Last Working Date.'
  }

  if (leaveDays.value.length === 0) {
    return 'No leave days between the selected dates.'
  }

  return `Total leave days: ${leaveDays.value.length}`
})

watchEffect(() => {
  if (leaveDays.value.length && leaveTypeStore.leaveTypes.length) {
    if (selectedLeaveTypes.value.length !== leaveDays.value.length) {
      selectedLeaveTypes.value = leaveDays.value.map(() => leaveTypeStore.leaveTypes[0].id)
    }

    // Check each leave day and select "weekend" for weekends based on the weekends array
    leaveDays.value.forEach(async (day, index) => {
      const weekdayName = new Date(day).toLocaleString('en-us', { weekday: 'long' }).toLowerCase()

      // Capitalize weekdayName for comparison (e.g., "friday" -> "Friday")
      const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)

      // Check if the current day matches any of the user's weekends
      if (weekends.value.includes(capitalizedWeekday)) {
        selectedLeaveTypes.value[index] = 'weekend' // Auto-select "weekend" for matching days
      }

      const holidayStatus = await isHoliday(day) // Check if the day is a holiday

      if (holidayStatus) {
        selectedLeaveTypes.value[index] = 'holiday' // Auto-select "holiday" for holiday days
      }
    })
  }
})

watch(
  () => selectUser.value,
  (newValue) => {
    form.value.handover_user_id = newValue?.id
  },
)

const submitLeaveApplication = async () => {
  loading.value = true
  error.value = null

  try {
    const leaveDaysPayload = leaveDays.value
      .map((day, index) => {
        return {
          date: day,
          leave_type_id:
            selectedLeaveTypes.value[index] !== 'weekend' &&
            selectedLeaveTypes.value[index] !== 'holiday'
              ? selectedLeaveTypes.value[index]
              : null,
        }
      })
      .filter((leaveDay) => leaveDay.leave_type_id !== null) // 'weekend' অপশন ফিল্টার করে সরিয়ে ফেলছে

    const leaveDaysJson = leaveDays.value
      .map((day, index) => {
        return {
          date: day,
          leave_type_id: selectedLeaveTypes.value[index] || '',
        }
      })
      .filter((leaveDay) => leaveDay.leave_type_id !== null) // 'weekend' অপশন ফিল্টার করে সরিয়ে ফেলছে

    const payload = {
      id: leaveApplicationId.value,
      user_id: leaveApplication?.value?.user_id,
      last_working_date: form.value.last_working_date,
      resumption_date: form.value.resumption_date,
      reason: form.value.reason,
      works_in_hand: form.value.works_in_hand,
      handover_user_id: form.value.handover_user_id,
      leave_days: leaveDaysPayload,
      json_data: leaveDaysJson,
    }
    if (payload.id) {
      const newApplication = await leaveApplicationStore.updateLeaveApplication(payload.id, payload)
      if (newApplication) {
        router.push({ name: 'LeaveApplicationShow', params: { id: newApplication?.id } })
      }
    }
  } catch (err) {
    error.value = err.message || 'Failed to submit leave application'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.go(-1)
}

// Helper function to check if the day is a holiday
const isHoliday = async (day) => {
  try {
    // Make API call to check holidays for the specific day
    const response = await holidayStore.fetchHolidays({
      start_date: day,
    })
    const holidayDates = response[0]?.start_date || [] // Example: response could have dates
    return holidayDates.includes(day) // Check if the day is a holiday
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return false // Return false if an error occurs
  }
}
</script>

<template>
  <div class="my-container max-w-3xl space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Application Form</h1>
      <div>
        <RouterLink to="/my-applications" class="btn-2">Home</RouterLink>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <form v-else @submit.prevent="submitLeaveApplication" class="space-y-4 card-bg p-4 md:p-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="last-working-date" class="block text-sm font-medium">Last Working Date</label>
          <input
            type="date"
            id="last-working-date"
            v-model="form.last_working_date"
            class="input-1 w-full"
            required
          />
        </div>

        <div>
          <label for="resumption-date" class="block text-sm font-medium">Resumption Date</label>
          <input
            type="date"
            id="resumption-date"
            v-model="form.resumption_date"
            class="input-1 w-full"
            required
          />
        </div>
      </div>
      <div v-if="form.last_working_date && form.resumption_date" class="">
        <p class="text-blue-600 font-medium">{{ leaveDaysMessage }}</p>
      </div>

      <!-- Leave days with radio groups -->
      <div v-if="leaveDays.length" class="bg-gray-100 p-2 rounded-md">
        <h2 class="text-lg font-semibold">Leave Days</h2>
        <div>
          <div
            v-for="(day, index) in leaveDays"
            :key="index"
            class="flex gap-4 mb-2 bg-white p-2 rounded-md"
          >
            <div class="font-semibold">{{ day }}</div>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="type in leaveTypeStore.leaveTypes"
                :key="type.id"
                class="flex items-center space-x-1"
              >
                <input
                  type="radio"
                  :name="'leaveType-' + index"
                  :value="type.id"
                  v-model="selectedLeaveTypes[index]"
                />
                <span>{{ type.name }}</span>
              </label>
              <label class="flex items-center space-x-1">
                <input
                  type="radio"
                  :name="'leaveType-' + index"
                  value="weekend"
                  v-model="selectedLeaveTypes[index]"
                />
                <span>Weekend</span>
              </label>
              <label class="flex items-center space-x-1">
                <input
                  type="radio"
                  :name="'leaveType-' + index"
                  value="holiday"
                  v-model="selectedLeaveTypes[index]"
                />
                <span> Holiday</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label for="reason" class="block text-sm font-medium">Reason</label>
        <textarea
          id="reason"
          v-model="form.reason"
          class="input-1 w-full"
          placeholder="Enter your reason for leave"
        ></textarea>
      </div>

      <div>
        <label for="handover-user" class="block text-sm font-medium">Handover User</label>
        <MultiselectDropdown
          v-model="selectUser"
          :options="userStore.users"
          :multiple="false"
          label="label"
          placeholder="Select user"
        />
      </div>

      <div>
        <label for="works-in-hand" class="block text-sm font-medium">Works in Hand</label>
        <textarea
          id="works-in-hand"
          v-model="form.works_in_hand"
          class="input-1 w-full"
          placeholder="Enter details of works in hand"
          rows="6"
        ></textarea>
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-end">
        <button type="submit" class="btn-1">Update</button>
      </div>
    </form>
  </div>
</template>
