<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useHolidayStore } from '@/stores/holiday'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useLeaveTypeStore } from '@/stores/leave-type'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'

// Props
const props = defineProps({
  userInfo: Object
})

const emit = defineEmits(['close', 'formSuccessClosed'])

const leaveApplicationStore = useLeaveApplicationStore()
const leaveTypeStore = useLeaveTypeStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const holidayStore = useHolidayStore()

const selectUser = ref('')
const isDirectApprove = ref(true)

const form = ref({
  last_working_date: '',
  resumption_date: '',
  reason: '',
  works_in_hand: '',
  handover_user_id: '',
  leave_days: [],
})

const selectedLeaveTypes = ref([])
const loading = ref(false)
const error = ref(null)

const weekends = computed(() => {
  return props?.userInfo?.assign_weekend?.weekends || props?.userInfo?.weekends
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
  if (!form.value.last_working_date || !form.value.resumption_date) return ''

  const start = new Date(form.value.last_working_date)
  const end = new Date(form.value.resumption_date)

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

    leaveDays.value.forEach(async (day, index) => {
      const weekdayName = new Date(day).toLocaleString('en-us', { weekday: 'long' }).toLowerCase()
      const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)

      if (weekends.value.includes(capitalizedWeekday)) {
        selectedLeaveTypes.value[index] = 'weekend'
      }

      const holidayStatus = await isHoliday(day)
      if (holidayStatus) {
        selectedLeaveTypes.value[index] = 'holiday'
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
      .filter((leaveDay) => leaveDay.leave_type_id !== null)

    const leaveDaysJson = leaveDays.value
      .map((day, index) => {
        return {
          date: day,
          leave_type_id: selectedLeaveTypes.value[index] || '',
        }
      })
      .filter((leaveDay) => leaveDay.leave_type_id !== null)

    const payload = {
      user_id: props?.userInfo?.id,
      last_working_date: form.value.last_working_date,
      resumption_date: form.value.resumption_date,
      reason: form.value.reason,
      works_in_hand: form.value.works_in_hand,
      handover_user_id: isDirectApprove.value ? null : form.value.handover_user_id,
      leave_days: leaveDaysPayload,
      json_data: leaveDaysJson,
      is_direct_approve: isDirectApprove.value,
    }

    const newApplication = await leaveApplicationStore.storeAdminLeaveApplication(payload)
    if (newApplication) {
      emit('formSuccessClosed')
    }
  } catch (err) {
    error.value = err.message || 'Failed to submit leave application'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  watchEffect(() => {
    const companyId = props?.userInfo?.company_id
    if (companyId) {
      leaveTypeStore.fetchLeaveTypes(companyId)
    }
  })
  userStore.fetchTypeWiseEmployees({ except: 'auth' })
})

const goBack = () => {
  emit('close')
}

const isHoliday = async (day) => {
  try {
    const response = await holidayStore.fetchHolidays({ start_date: day })
    const holidayDates = response[0]?.start_date || []
    return holidayDates.includes(day)
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return false
  }
}
</script>

<template>
  <div class="space-y-4 p-2 md:p-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Application Form</h1>
      <div></div>
    </div>

    <LoaderView v-if="loading" />

    <form v-else @submit.prevent="submitLeaveApplication" class="space-y-4 card-bg p-4 md:p-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium">Last Working Date</label>
          <input type="date" v-model="form.last_working_date" class="input-1 w-full" required />
        </div>
        <div>
          <label class="block text-sm font-medium">Resumption Date</label>
          <input type="date" v-model="form.resumption_date" class="input-1 w-full" required />
        </div>
      </div>

      <div>
        <label class="inline-flex items-center space-x-2">
          <input type="checkbox" v-model="isDirectApprove" class="form-checkbox text-blue-600">
          <span class="text-lg font-sem">Direct Approve</span>
        </label>
      </div>

      <div v-if="form.last_working_date && form.resumption_date">
        <p class="text-blue-600 font-medium">{{ leaveDaysMessage }}</p>
      </div>

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
                <input type="radio" :name="'leaveType-' + index" :value="type.id" v-model="selectedLeaveTypes[index]" />
                <span>{{ type.name }}</span>
              </label>
              <label class="flex items-center space-x-1">
                <input type="radio" :name="'leaveType-' + index" value="weekend" v-model="selectedLeaveTypes[index]" />
                <span>Weekend</span>
              </label>
              <label class="flex items-center space-x-1">
                <input type="radio" :name="'leaveType-' + index" value="holiday" v-model="selectedLeaveTypes[index]" />
                <span>Holiday</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium">Reason</label>
        <textarea v-model="form.reason" class="input-1 w-full" placeholder="Enter your reason for leave"></textarea>
      </div>

      <div v-if="!isDirectApprove">
        <label class="block text-sm font-medium">Handover User</label>
        <MultiselectDropdown
          v-model="selectUser"
          :options="userStore.users"
          :multiple="false"
          label="label"
          placeholder="Select user"
          class="z-50"
        />
      </div>
      <div v-if="!isDirectApprove">
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
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
