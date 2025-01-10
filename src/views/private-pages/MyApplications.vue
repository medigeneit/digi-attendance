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
  </div>
</template>
