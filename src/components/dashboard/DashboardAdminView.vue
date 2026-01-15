<script setup>
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
const userStore = useUserStore()
const authStore = useAuthStore()
const { dashboardInfo, selectedDate } = storeToRefs(userStore)

const date = computed(() => {
  return new Date()
})
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3 mt-4 px-4 container mx-auto">
    <RouterLink
      :to="{ name: 'TodayAttendanceReport', query: { status: 'all' } }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.totalUsers }}
      </span>
      Total Employees
    </RouterLink>
    <RouterLink
      :to="{ name: 'TodayAttendanceReport', query: { status: 'Present' } }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.todayPresents }}
      </span>
      Today Present
    </RouterLink>
    <RouterLink
      :to="{ name: 'TodayAttendanceReport', query: { status: 'Absent' } }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.todayAbsents }}
      </span>
      Today Absent
    </RouterLink>
    <RouterLink
      :to="{ name: 'LeaveApplicationsForDay', query: { applicationType: 'today' } }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.todayLeaves }}
      </span>
      Today Leave
    </RouterLink>
    <RouterLink
      :to="{ name: 'LeaveApplicationsForDay', query: { applicationType: 'tomorrow' } }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.tomorrowLeaves }}
      </span>
      Tomorrow Leave
    </RouterLink>
    <RouterLink
      :to="{ name: 'DateWiseShortLeaveList', query: { date: selectedDate } }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.todayShortLeaves }}
      </span>
      Today Short Leaves
    </RouterLink>
    <RouterLink
      :to="{ name: 'DailyLateAttendanceReport', query: { date: selectedDate } }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.todayLateEntries }}
      </span>
      Today Late Report
    </RouterLink>
    <RouterLink
      :to="{
        name: 'PreviousAfterApplicationList',
        query: { applicationType: 'prev', date: selectedDate },
      }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.prevWeekLeaves }}
      </span>
      Leave history of previous week
    </RouterLink>
    <RouterLink
      :to="{
        name: 'PreviousAfterApplicationList',
        query: { applicationType: 'after', date: selectedDate },
      }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.nextWeekLeaves }}
      </span>
      Upcoming leaves
    </RouterLink>

    <RouterLink
      :to="{
        name: 'TodoList',
        query: {
          day: date.getDate(),
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          type: 'day-view',
          // company_id: authStore.user?.company_id,
        },
      }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.todayTotalTodos }}
      </span>
      Today Todos
    </RouterLink>

    <RouterLink
      :to="{
        name: 'TodoList',
        query: {
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          type: 'month-view',
          // company_id: authStore.user?.company_id,
        },
      }"
      class="main-button"
    >
      <span class="text-3xl">
        {{ dashboardInfo?.thisMonthTotalTodos }}
      </span>
      Todos In This Month
    </RouterLink>
    <RouterLink
      :to="{
        name: 'WeekLeaveHistories',
        query: {
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          type: 'month-view',
        },
      }"
      class="main-button"
    >
      Week Leave Histories
    </RouterLink>
  </div>
</template>
