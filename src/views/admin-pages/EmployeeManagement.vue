<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'TemplateItems', params:{id:1} }" class="main-button">
      <i class="far fa-tasks text-3xl"></i>
      Joining Template Items
    </RouterLink>
    <RouterLink :to="{ name: 'TemplateItems', params:{id:2} }" class="main-button">
      <i class="far fa-tasks text-3xl"></i>
      Exit Template Items
    </RouterLink>
    <RouterLink :to="{ name: 'checklists.board', query:{type:'joining'} }" class="main-button">
      <i class="far fa-tasks text-3xl"></i>
      Joining Checklist
    </RouterLink>
    <RouterLink :to="{ name: 'checklists.board', query:{type:'exit'} }" class="main-button">
      <i class="far fa-tasks text-3xl"></i>
      Exit Checklist
    </RouterLink>
    <RouterLink :to="{ name: 'ctdi', query:{templateId:2} }" class="main-button">
      <i class="far fa-tasks text-3xl"></i>
      Template Items Assign
    </RouterLink>
  </div>
</template>
