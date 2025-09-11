<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'KpiMonthlyList' }" class="main-button">
      <i class="far fa-file-chart-line text-3xl"></i>
      Monthly KPI Format
    </RouterLink>
    <RouterLink :to="{ name: 'MonthlyKpiFormList' }" class="main-button">
      <i class="far fa-file-chart-line text-3xl"></i>
      Monthly KPI Forms
    </RouterLink>
  </div>
</template>
