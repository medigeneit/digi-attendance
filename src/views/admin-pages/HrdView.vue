<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'EmployeeAttendance' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Employee Attendance
    </RouterLink>
    <RouterLink :to="{ name: 'LeaveApplicationList' }" class="main-button">
      <i class="fas fa-leaf text-3xl"></i>
      Employee Leave Applications
    </RouterLink>
  </div>
</template>
