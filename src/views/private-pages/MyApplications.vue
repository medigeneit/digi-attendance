<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'MyLeaveApplications' }" class="main-button">
      <i class="fas fa-leaf text-3xl"></i>
      Leave Applications
    </RouterLink>
    <RouterLink :to="{ name: 'MyShortLeaves' }" class="main-button">
      <i class="fab fa-pagelines text-3xl"></i>
      Short Leaves
    </RouterLink>
    <RouterLink :to="{ name: 'MyShiftExchangeList' }" class="main-button">
      <i class="fas fa-exchange text-3xl"></i>
      Shift Exchanges
    </RouterLink>
    <RouterLink :to="{ name: 'MyOffdayExchangeList' }" class="main-button">
      <i class="fas fa-calendar-day text-3xl"></i>
      Offday Exchanges
    </RouterLink>
    <RouterLink :to="{ name: 'MyManualAttendanceList' }" class="main-button">
      <i class="fas fa-fingerprint text-3xl"></i>
      Manual Attendance List
    </RouterLink>
  </div>
</template>
