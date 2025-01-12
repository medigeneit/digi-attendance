<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'MyLeaveApplications' }" class="main-button">
      <i class="fas fa-leaf text-3xl"></i>
      My Leave Applications
    </RouterLink>
    <RouterLink :to="{ name: 'MyShortLeaves' }" class="main-button">
      <i class="fab fa-pagelines text-3xl"></i>
      My Short Leaves
    </RouterLink>
    <RouterLink :to="{ name: 'MyShiftExchangeList' }" class="main-button">
      <i class="fas fa-exchange text-3xl"></i>
      My Shift Exchanges
    </RouterLink>
    <RouterLink :to="{ name: 'MyOffdayExchangeList' }" class="main-button">
      <i class="fas fa-calendar-day text-3xl"></i>
      My Offday Exchanges
    </RouterLink>
  </div>
</template>
