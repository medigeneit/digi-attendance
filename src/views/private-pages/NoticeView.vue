<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'MyNoticeList' }" class="main-button">
      <i class="far fa-exclamation text-3xl"></i>
      General Notice
    </RouterLink>
    <RouterLink :to="{ name: 'PolicyList' }" class="main-button">
      <i class="far fa-file-chart-line text-3xl"></i>
      Office Policy
    </RouterLink>
  </div>
</template>
