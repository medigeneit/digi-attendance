<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'EmployeeAttendance' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Employee Attendance
    </RouterLink>

    <RouterLink :to="{ name: 'EmployeeAttendanceLog' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Attendance Log
    </RouterLink>

    <RouterLink :to="{ name: 'MonthWiseApplicationLog' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Monthly Application Log
    </RouterLink>

    <RouterLink :to="{ name: 'LeaveApplicationList' }" class="main-button">
      <i class="fas fa-leaf text-3xl"></i>
      Employee Leave Applications
    </RouterLink>
    <RouterLink :to="{ name: 'HrdAdminLeaveApplication' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Admin Leave Applications
    </RouterLink>
    <RouterLink :to="{ name: 'ShortLeaveList' }" class="main-button">
      <i class="fab fa-pagelines text-3xl"></i>
      Employee Short Leaves
    </RouterLink>
    <RouterLink :to="{ name: 'ShiftExchangeList' }" class="main-button">
      <i class="fas fa-exchange text-3xl"></i>
      Employee Shift Exchanges
    </RouterLink>
    <RouterLink :to="{ name: 'OffdayExchangeList' }" class="main-button">
      <i class="fas fa-calendar-day text-3xl"></i>
      Employee Offday Exchanges
    </RouterLink>
    <RouterLink :to="{ name: 'ManualAttendanceList' }" class="main-button">
      <i class="fas fa-fingerprint text-3xl"></i>
      Manual Attendance List
    </RouterLink>
    <RouterLink :to="{ name: 'OvertimeList' }" class="main-button">
      <i class="far fa-business-time text-3xl"></i>
      Overtime List
    </RouterLink>

    <RouterLink :to="{ name: 'NoticeList' }" class="main-button">
      <i class="far fa-exclamation-circle text-3xl"></i>
      Notice List
    </RouterLink>
    <RouterLink :to="{ name: 'ShiftSchedule' }" class="main-button">
      <i class="far fa-exclamation-circle text-3xl"></i>
      Shift Schedules
    </RouterLink>
  </div>
</template>
