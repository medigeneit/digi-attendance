<script setup></script>

<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'ProjectList' }" class="main-button">
      <i class="far fa-folders text-3xl"></i>
      Projects
    </RouterLink>
    <RouterLink :to="{ name: 'RequirementList' }" class="main-button">
      <i class="far fa-file-edit text-3xl"></i>
      Requirements
    </RouterLink>
    <RouterLink :to="{ name: 'TaskList' }" class="main-button">
      <i class="fas fa-tasks text-3xl"></i>
      Tasks
    </RouterLink>
    <RouterLink :to="{ name: 'MyTodoList' }" class="main-button">
      <i class="far fa-clipboard-list-check text-3xl"></i>
      My Todo List
    </RouterLink>
    <RouterLink :to="{ name: 'BugList' }" class="main-button">
      <i class="far fa-bug text-3xl"></i>
      Bug
    </RouterLink>
    <RouterLink :to="{ name: 'MeetingList' }" class="main-button">
      <i class="far fa-handshake text-3xl"></i>
      Meeting
    </RouterLink>
  </div>
</template>
