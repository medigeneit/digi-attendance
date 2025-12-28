<script setup>
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const router = useRouter()

const hasAccessTo = (routeName) => {
  const route = router.getRoutes().find(r => r.name === routeName)
  const allowedRoles = route?.meta?.roles
  if (!allowedRoles) return true
  return allowedRoles.includes(user.value?.role || [])
}
</script>
<template>
  <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'TodayAttendanceReport' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Daily Attendance Report
    </RouterLink>
    <RouterLink :to="{ name: 'DailyLateAttendanceReport' }" class="main-button">
      <i class="far fa-file-chart-line text-3xl"></i>
      Daily Late Reports
    </RouterLink>
    <RouterLink :to="{ name: 'LateAttendanceReport' }" class="main-button">
      <i class="far fa-file-chart-line text-3xl"></i>
      Monthly Late Reports
    </RouterLink>
    <RouterLink :to="{ name: 'AttendanceSummaryReport' }" class="main-button">
      <i class="fas fa-calendar-day text-3xl"></i>
      Monthly Attendance Summary
    </RouterLink>
    <RouterLink v-if="hasAccessTo('YearlyAttendanceSummary')" :to="{ name: 'YearlyAttendanceSummary' }" class="main-button">
      <i class="fas fa-calendar-star text-3xl"></i>
      Yearly Attendance Summary
    </RouterLink>
    <RouterLink :to="{ name: 'DateWiseAttendanceSummaryReport' }" class="main-button">
      <i class="fas fa-calendar-day text-3xl"></i>
      Date Range Attendance Report
    </RouterLink>

    <RouterLink :to="{ name: 'OvertimeReport' }" class="main-button">
      <i class="fas fa-calendar-day text-3xl"></i>
      Overtime Report
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('MonthWiseApplicationLog')"
      :to="{ name: 'MonthWiseApplicationReport' }"
      class="main-button"
    >
      <i class="far fa-file-contract text-3xl"></i>
      Monthly Application Report
    </RouterLink>

  </div>
</template>
