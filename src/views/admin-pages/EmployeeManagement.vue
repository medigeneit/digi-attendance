<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'lifecycle.board', params:{ flowType:'onboarding' } }" class="main-button">
      <i class="far fa-route text-3xl"></i>
      Onboarding Lifecycle
    </RouterLink>
    <RouterLink :to="{ name: 'lifecycle.board', params:{ flowType:'offboarding' } }" class="main-button">
      <i class="far fa-sign-out-alt text-3xl"></i>
      Offboarding Lifecycle
    </RouterLink>
    <RouterLink :to="{ name: 'checklists.board', query:{type:'joining'} }" class="main-button">
      <i class="far fa-tasks text-3xl"></i>
      Joining Checklist
    </RouterLink>
    <RouterLink :to="{ name: 'checklists.board', query:{type:'exit'} }" class="main-button">
      <i class="far fa-tasks text-3xl"></i>
      Exit Checklist
    </RouterLink>
  </div>
</template>
