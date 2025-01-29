<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'TodayAttendanceReport' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Today Attendance Report
    </RouterLink>
    <RouterLink :to="{ name: 'LeaveApplicationList' }" class="main-button">
      <i class="fas fa-leaf text-3xl"></i>
      late-report
    </RouterLink>
    <RouterLink :to="{ name: 'ShortLeaveList' }" class="main-button">
      <i class="fab fa-pagelines text-3xl"></i>
      Today Summary (2025-01-29)
    </RouterLink>
    <RouterLink :to="{ name: 'ShiftExchangeList' }" class="main-button">
      <i class="fas fa-exchange text-3xl"></i>
      Monthly Attendance (January, 2025) Total
    </RouterLink>
    <RouterLink :to="{ name: 'OffdayExchangeList' }" class="main-button">
      <i class="fas fa-calendar-day text-3xl"></i>
      Attendance Monthly Summary
    </RouterLink>
    <RouterLink :to="{ name: 'ManualAttendanceList' }" class="main-button">
      <i class="fas fa-fingerprint text-3xl"></i>
      Yearly Holiday Report
    </RouterLink>
  </div>
</template>
