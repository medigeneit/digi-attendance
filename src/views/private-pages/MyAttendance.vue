<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ApplicationMenu from '@/components/ApplicationMenu.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AttendanceTable from '@/components/AttendanceTable.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const attendanceStore = useAttendanceStore()

const selectedMonth = ref(route.query.date || attendanceStore.selectedMonth)

const showModal = ref(false)

function openModal() {
  showModal.value = true
}

const formattedMonthName = computed(() => {
  if (!selectedMonth.value) return ''
  const [year, month] = selectedMonth.value.split('-')
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const fetchAttendance = async () => {
  if (authStore.user?.id && selectedMonth.value) {
    await attendanceStore.getMonthlyAttendanceByShift(authStore.user.id, selectedMonth.value)
  }
}

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
  } else {
    await authStore.fetchUser()
    fetchAttendance()
  }
})

watch(selectedMonth, async (newMonth) => {
  attendanceStore.selectedMonth = newMonth
  await fetchAttendance()
})

watch(selectedMonth, (date) => {
  router.replace({
    query: {
      ...route.query,
      date: date,
    },
  })
})

const goBack = () => router.go(-1)

const getInitials = (name) => {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }
}
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="md:flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg md:title-lg flex-wrap text-center">
        Attendance of {{ formattedMonthName }}
      </h1>
      <div class="flex gap-4">
        <div>
          <input
            id="monthSelect"
            type="month"
            v-model="selectedMonth"
            @change="fetchAttendance"
            class="input-1"
          />
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4 text-sm">
      <div class="card-bg p-4 gap-1">
        <h2 class="title-md">User Info</h2>
        <hr />
        <div class="grid md:grid-cols-2">
          <p><strong>Name:</strong> {{ authStore.user?.name }}</p>
          <p><strong>Designation:</strong> {{ authStore.user?.designation?.title }}</p>
          <p><strong>Department:</strong> {{ authStore.user?.department?.name }}</p>
          <p><strong>Company:</strong> {{ authStore.user?.company?.name }}</p>
          <p><strong>Phone:</strong> {{ authStore.user?.phone }}</p>
          <p><strong>Email:</strong> {{ authStore.user?.email }}</p>
          <p><strong>Employee ID:</strong> {{ authStore.user?.employee_id }}</p>
          <p><strong>Blood Group:</strong> {{ authStore.user?.blood || 'N/A' }}</p>
          <p><strong>Joining Date:</strong> {{ authStore.user?.joining_date }}</p>
        </div>
      </div>
      <div class="card-bg p-4 gap-1">
        <div class="flex justify-between items-center">
          <h2 class="title-md">Attendance Summary</h2>
          <button @click="openModal()" class="btn-2">Apply Application</button>

          <ApplicationMenu v-if="showModal" @close="showModal = false" />
        </div>
        <hr />
        <div class="grid md:grid-cols-2">
          <p>
            <strong>Total Working Days:</strong>
            {{ attendanceStore?.summary?.total_working_days || 0 }}
          </p>
          <p>
            <strong>Present Days:</strong> {{ attendanceStore?.summary?.total_present_days || 0 }}
          </p>
          <p>
            <strong>Absent Days:</strong> {{ attendanceStore?.summary?.total_absent_days || 0 }}
          </p>
          <p><strong>Late Days:</strong> {{ attendanceStore?.summary?.actual_late_day || 0 }}</p>
          <p>
            <strong>Total Working Hours:</strong>
            {{ attendanceStore?.summary?.total_working_hours }}
          </p>
          <p>
            <strong>Total Overtime Hours:</strong>
            {{ attendanceStore?.summary?.total_overtime_hours }}
          </p>
        </div>

        <p></p>
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <AttendanceTable :logs="attendanceStore?.monthlyLogs" :applyApplication="true" />
    </div>
  </div>
</template>
