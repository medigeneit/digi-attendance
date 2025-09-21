<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
const userStore = useUserStore()
const { dashboardInfo, selectedDate } = storeToRefs(userStore)
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3 mt-4 container mx-auto">
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
  </div>
</template>
