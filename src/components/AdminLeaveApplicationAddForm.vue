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
const { userLeaveBalance } = storeToRefs(userStore)
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

  return null
})

watchEffect(async () => {
  if (leaveDays.value.length && userLeaveBalance.value.length) {
    await holidayStore.fetchHolidays({
      company_id: authStore?.user?.company_id,
      start_date: leaveDays.value[0],
      end_date: leaveDays.value[leaveDays.value.length - 1],
    })

    // Check each leave day and select "weekend" for weekends based on the weekends array
    leaveDays.value.forEach(async (day, index) => {
      const weekdayName = new Date(day).toLocaleString('en-us', { weekday: 'long' }).toLowerCase()

      // Capitalize weekdayName for comparison (e.g., "friday" -> "Friday")
      const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)

      // Check if the current day matches any of the user's weekends
      if (weekends.value.includes(capitalizedWeekday)) {
        selectedLeaveTypes.value[index] = 'weekend' // Auto-select "weekend" for matching days
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

onMounted(async () => {
  watchEffect(() => {
    const userId = props?.userInfo?.id
    if (userId) {
      userStore.fetchUserLeaveBalances(userId)
    }
  })


  await userStore.fetchTypeWiseEmployees({ except: 'auth' })
})

const goBack = () => {
  emit('close')
}
</script>

<template>
  <div class="space-y-6 p-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Admin panel</p>
        <h1 class="title-md md:title-lg">Leave Application Form</h1>
      </div>
      <button
        type="button"
        class="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
        @click="goBack"
      >
        Close
      </button>
    </header>

    <LoaderView v-if="loading" />

    <form
      v-else
      @submit.prevent="submitLeaveApplication"
      class="space-y-6 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm backdrop-blur"
    >
      <section class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-slate-600">Last Working Date</label>
            <input type="date" v-model="form.last_working_date" class="input-1 w-full" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-slate-600">Resumption Date</label>
            <input type="date" v-model="form.resumption_date" class="input-1 w-full" required />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div>
            <p class="text-sm font-semibold text-slate-600">Approval preference</p>
            <p class="text-xs text-slate-500">
              Toggle off to assign a handover owner and capture works in hand.
            </p>
          </div>
          <label class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <input type="checkbox" v-model="isDirectApprove" class="h-4 w-4 text-blue-600" />
            <span class="text-sm font-semibold text-slate-700">Direct approve</span>
          </label>
        </div>

        <div
          v-if="form.last_working_date && form.resumption_date && leaveDaysMessage"
          class="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-medium text-blue-700"
        >
          {{ leaveDaysMessage }}
        </div>
      </section>

      <section class="space-y-4 rounded-2xl border border-dashed border-slate-200 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-base font-semibold text-slate-700">Day-by-day allocation</p>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {{ leaveDays.length }} day{{ leaveDays.length === 1 ? '' : 's' }}
          </span>
        </div>

        <div v-if="!leaveDays.length" class="rounded-xl border border-slate-100 bg-white/70 p-6 text-center text-sm text-slate-500">
          No days calculated yet. Pick a last working date and a resumption date to configure the breakdown.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(day, index) in leaveDays"
            :key="index"
            class="rounded-2xl flex border border-slate-100 bg-white p-2 items-center justify-between shadow-sm transition hover:border-blue-200"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-base font-semibold text-slate-700">{{ day }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="type in userLeaveBalance"
                :key="type.id"
                class="cursor-pointer"
                :title="type.remaining_days === 0 ? 'No balance remaining' : ''"
              >
                <input
                  type="radio"
                  :name="'leaveType-' + index"
                  :value="type.id"
                  v-model="selectedLeaveTypes[index]"
                  class="peer hidden"
                  :disabled="selectedLeaveTypes.filter((t) => t === type.id).length >= type.remaining_days"
                />
                <span
                  class="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-600 peer-disabled:opacity-40"
                >
                  {{ type.name }}
                  <span class="text-xs text-slate-400">({{ type.remaining_days }}d)</span>
                </span>
              </label>

              <label class="cursor-pointer">
                <input
                  type="radio"
                  :name="'leaveType-' + index"
                  value="weekend"
                  v-model="selectedLeaveTypes[index]"
                  class="peer hidden"
                />
                <span
                  class="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-600"
                >
                  Weekend
                </span>
              </label>

              <label class="cursor-pointer">
                <input
                  type="radio"
                  :name="'leaveType-' + index"
                  value="holiday"
                  v-model="selectedLeaveTypes[index]"
                  class="peer hidden"
                />
                <span
                  class="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-600"
                >
                  Holiday
                </span>
              </label>
            </div>
            <p class="text-xs uppercase tracking-wide text-slate-400">
                {{ selectedLeaveTypes[index] ? 'Assigned' : 'Unassigned' }}
              </p>
          </div>
        </div>
      </section>

      <section class="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-600">Reason</label>
          <textarea
            v-model="form.reason"
            class="input-1 min-h-[80px] w-full"
            placeholder="Summarize why the leave is required"
          ></textarea>
        </div>

        <div v-if="!isDirectApprove" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-slate-600">Handover user</label>
            <MultiselectDropdown
              v-model="selectUser"
              :options="userStore.users"
              :multiple="false"
              label="label"
              placeholder="Select the teammate who will receive the handover"
              class="z-50"
            />
          </div>
          <div class="space-y-2">
            <label for="works-in-hand" class="text-sm font-semibold text-slate-600">Works in hand</label>
            <textarea
              id="works-in-hand"
              v-model="form.works_in_hand"
              class="input-1 min-h-[100px] w-full"
              placeholder="Detail the tasks that will continue while away"
            ></textarea>
          </div>
        </div>
      </section>

      <div v-if="error" class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
        {{ error }}
      </div>

      <div class="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          class="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
          @click="goBack"
        >
          Cancel
        </button>
        <button type="submit" class="btn-2 rounded-full px-6 py-2">Submit request</button>
      </div>
    </form>
  </div>
</template>
