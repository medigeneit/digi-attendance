<script setup></script>
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
  </div>
</template>
