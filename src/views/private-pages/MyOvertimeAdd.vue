<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { useDepartmentStore } from '@/stores/department'
import { useOvertimeStore } from '@/stores/overtime'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const departmentStore = useDepartmentStore()
const overtimeStore = useOvertimeStore()
const attendanceStore = useAttendanceStore()
const authStore = useAuthStore()

const loading = ref(false)
const attendanceLog = ref({})

const form = ref({
  date: route.query.date || '',
  duty_type: '',
  request_overtime_hours: '',
  assigned_in_charge_user_id: '',
  work_details: '',
})

const fetchAttendance = async () => {
  await attendanceStore.getMonthlyAttendanceByShift(
    authStore.user.id,
    getMonthFromDate(form.value.date),
  )

  attendanceLog.value = await attendanceStore.getUserDailyLogsByDate(
    authStore.user.id,
    form.value.date,
  )
}

const getMonthFromDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

const goBack = () => {
  router.go(-1)
}

const submit = async () => {
  await overtimeStore.createOvertime(form.value)
  router.push({ name: 'MyOvertimeList' })
}

onMounted(async () => {
  if (!authStore.user?.id) {
    await authStore.fetchUser()
  }

  if (form.value.date) {
    await fetchAttendance()
  }

  await departmentStore.fetchDepartments('all')
})
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Overtime Request Form</h1>
    </div>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submit" class="space-y-4 card-bg md:p-8 p-4 text-sm md:text-base">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="date" class="block text-sm font-medium">Date</label>
          <input
            @change="fetchAttendance"
            type="date"
            id="date"
            v-model="form.date"
            class="input-1 w-full"
            required
            :max="new Date(Date.now() - 86400000).toISOString().split('T')[0]"
          />
        </div>
        <div>
          <label for="duty_type" class="block text-sm font-medium">Duty Type</label>
          <select id="duty_type" v-model="form.duty_type" class="input-1 w-full" required>
            <option value="" selected disabled>--Duty Type--</option>
            <option value="WL">WL</option>
            <option value="HD">HD</option>
            <option value="OVT">OVT</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <span class="block text-sm font-medium">Check In</span>
          <div class="input-1 w-full text-center">
            {{ attendanceLog.entry_time || '--:--' }}
          </div>
        </div>
        <div>
          <span class="block text-sm font-medium">Check Out</span>
          <div class="input-1 w-full text-center">
            {{ attendanceLog.exit_time || '--:--' }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="request_overtime_hours" class="block text-sm font-medium">
            Overtime (Hour)
          </label>
          <input
            @change="fetchAttendance"
            type="number"
            id="request_overtime_hours"
            v-model="form.request_overtime_hours"
            class="input-1 w-full"
            required
          />
        </div>

        <div>
          <label for="assigned_in_charge_user_id" class="block text-sm font-medium">
            In-Charge
          </label>
          <select
            id="assigned_in_charge_user_id"
            v-model="form.assigned_in_charge_user_id"
            class="input-1 w-full"
            required
          >
            <option value="" selected disabled>--In-Charge--</option>
            <template v-for="department in departmentStore.departments" :key="department.id">
              <optgroup v-if="department.in_charge" :label="department.name">
                <option :value="department.in_charge.id">{{ department.in_charge.name }}</option>
              </optgroup>
            </template>
          </select>
        </div>
      </div>

      <div>
        <label for="assigned_in_charge_user_id" class="block text-sm font-medium">
          Details (Reason / Work description)
        </label>
        <textarea rows="4" v-model="form.work_details" class="input-1 w-full"></textarea>
      </div>

      <hr />

      <div v-if="overtimeStore.error" class="text-red-500 text-sm">{{ overtimeStore.error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
