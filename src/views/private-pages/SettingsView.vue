<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'UserList' }" class="main-button">
      <i class="fas fa-users text-3xl"></i>
      User List
    </RouterLink>
    <RouterLink :to="{ name: 'DepartmentList' }" class="main-button">
      <i class="fas fa-puzzle-piece text-3xl"></i>
      Department List
    </RouterLink>
    <RouterLink :to="{ name: 'CompanyList' }" class="main-button">
      <i class="fas fa-building text-3xl"></i>
      Company List
    </RouterLink>
    <RouterLink :to="{ name: 'DeviceList' }" class="main-button">
      <i class="fas fa-cash-register text-3xl"></i>
      Device List
    </RouterLink>
  </div>
</template>
