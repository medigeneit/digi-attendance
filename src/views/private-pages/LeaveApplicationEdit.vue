<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useHolidayStore } from '@/stores/holiday'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useLeaveTypeStore } from '@/stores/leave-type'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const leaveApplicationStore = useLeaveApplicationStore()
const router = useRouter()
const route = useRoute()
const leaveTypeStore = useLeaveTypeStore()
const userStore = useUserStore()
const { userLeaveBalance } = storeToRefs(userStore)
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

const selectedLeaveTypes = ref([])
const maxedOutTypes = ref([]);
const loading = ref(false)
const error = ref(null)
const isEditMode = ref(false)

const weekends = computed(() => {
  return (
    leaveApplicationStore?.leaveApplication?.user?.assign_weekend?.weekends ||
    leaveApplicationStore?.leaveApplication?.user?.weekends || []
  )
})

onMounted(async () => {
  loading.value = true
  try {
    const { id } = route.params
    isEditMode.value = !!id

    // Step 1: Fetch leave application
    await leaveApplicationStore.fetchLeaveApplicationById(id)

    const application = leaveApplicationStore.leaveApplication
    const user = application?.user

    if (!application || !user) return

    const user_id = application.user_id
    const companyId = user?.company?.id

    // Step 2: Fetch leave types for user's company
    if (companyId) {
      await leaveTypeStore.fetchLeaveTypes(companyId)
    }

    // Step 3: Fetch user leave balances
    if (user_id) {
      await userStore.fetchUserLeaveBalances(user_id)
    }

    // Step 4: Fetch type-wise employees
    await userStore.fetchTypeWiseEmployees({
      type: user.type,
      except: [user.id],
    })

    userStore.users = userStore.users.map((user) => ({
      ...user,
      label: user.name,
    }))

    // Set selected user if handover user exists
    if (userStore.users.length > 0) {
      const selected = userStore.users.find(
        (u) => u.id === application.handover_user_id
      )
      if (selected) selectUser.value = selected
    }

    // Step 5: Populate form values
    form.value = {
      user_id: application.user_id,
      last_working_date: application.last_working_date,
      resumption_date: application.resumption_date,
      reason: application.reason,
      works_in_hand: application.works_in_hand,
      handover_user_id: application.handover_user_id,
      leave_days: application.leave_days,
    }

    // Step 6: Set selected leave types
    if (application.json_data && Array.isArray(application.json_data)) {
      application.json_data.forEach((item, index) => {
        selectedLeaveTypes.value[index] = item.leave_type_id || userLeaveBalance.value[0]?.id
      })
    }

  } catch (error) {
    console.error('Failed to load leave application:', error)
  } finally {
    loading.value = false
  }
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

watchEffect(async () => {
  // if (isEditMode.value) return

  if (leaveDays.value.length && userLeaveBalance.value.length) {
    if (selectedLeaveTypes.value.length !== leaveDays.value.length) {
      selectedLeaveTypes.value = leaveDays.value.map(() => userLeaveBalance.value[0]?.id)
    }

    await holidayStore.fetchHolidays({
      company_id: authStore?.user?.company_id,
      start_date: leaveDays.value[0],
      end_date: leaveDays.value[leaveDays.value.length - 1],
    })

    leaveDays.value.forEach(async (day, index) => {
      const weekdayName = new Date(day).toLocaleString('en-us', { weekday: 'long' }).toLowerCase()
      const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)

      if (weekends.value.includes(capitalizedWeekday)) {
        selectedLeaveTypes.value[index] = 'weekend'
      }

      if (holidayStore.holidayDates.includes(day)) {
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

watch(selectedLeaveTypes, (newSelections) => {
  const typeCount = {};

  newSelections.forEach((val) => {
    if (typeof val === 'number') {
      typeCount[val] = (typeCount[val] || 0) + 1;
    }
  });

  const exceeded = userLeaveBalance.value.filter((type) => {
    const count = typeCount[type.id] || 0;
    return count > type.remaining_days;
  });

  if (exceeded.length) {
    maxedOutTypes.value = exceeded.map((t) => t.name);

    alert(
      `You have exceeded remaining days for: ${maxedOutTypes.value.join(', ')}`
    );
  } else {
    maxedOutTypes.value = [];
  }
});

const submitLeaveApplication = async () => {
  loading.value = true
  error.value = null

  try {
    const leaveDaysPayload = leaveDays.value
      .map((day, index) => ({
        date: day,
        leave_type_id:
          selectedLeaveTypes.value[index] !== 'weekend' &&
          selectedLeaveTypes.value[index] !== 'holiday'
            ? selectedLeaveTypes.value[index]
            : null,
      }))
      .filter((ld) => ld.leave_type_id !== null)

    const leaveDaysJson = leaveDays.value.map((day, index) => ({
      date: day,
      leave_type_id: selectedLeaveTypes.value[index] || '',
    }))

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

const goBack = () => router.go(-1)

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
  <div class="my-container max-w-3xl space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Application Edit Form</h1>
      <div>
        <RouterLink to="/applications" class="btn-2">Home</RouterLink>
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
                v-for="type in userLeaveBalance"
                :key="type.id"
                class="flex items-center space-x-1"
              >
                <input
                  type="radio"
                  :name="'leaveType-' + index"
                  :value="type.id"
                  v-model="selectedLeaveTypes[index]"
                  :disabled="selectedLeaveTypes.filter(t => t === type.id).length >= type.remaining_days"
                />
                <span>{{ type.leave_type }}</span>
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
