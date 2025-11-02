<script setup></script>
<template>
   <div class="px-4">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl md:text-2xl font-semibold tracking-tight">
        Performance & KPI
        
      </h1>
    </div>
    <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-4 px-4">
      <RouterLink :to="{ name: 'MonthlyKpiFormList' }" class="main-button">
        <i class="fal fa-analytics text-3xl"></i>
        Monthly KPI Forms
      </RouterLink>
      <RouterLink :to="{ name: 'AssignmentList' }" class="main-button">
        <i class="fal fa-clipboard-list-check text-3xl"></i>
        Assignment List
      </RouterLink>
      <RouterLink :to="{ name: 'EvaluationList' }" class="main-button">
        <i class="fal fa-tasks text-3xl"></i>
        Evaluation List
      </RouterLink>
      <RouterLink :to="{ name: 'YearlyEvaluationList' }" class="main-button">
        <i class="fal fa-chart-line text-3xl"></i>
        Yearly Evaluation
      </RouterLink>
      <RouterLink :to="{ name: 'MonthlyKpiReportList' }" class="main-button">
        <i class="fal fa-file-chart-line text-3xl"></i>
        Monthly KPI Reports
      </RouterLink>
      
    </div>
   </div>
</template>
