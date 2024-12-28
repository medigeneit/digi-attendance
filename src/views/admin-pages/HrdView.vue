<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'EmployeeAttendance' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Employee Attendance
    </RouterLink>
  </div>
</template>
