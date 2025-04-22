<template>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Total Tasks" value="24" subtitle="+2 from last week" icon="list-checks" />
        <Card title="In Progress" value="7" subtitle="-1 from last week" icon="clock" />
        <Card title="Completed" value="15" subtitle="+3 from last week" icon="check-circle" />
        <Card title="Requirements" value="18" subtitle="12 completed" icon="file-check" />
      </div>
  
      <Tabs :tabs="tabs" />
    </main>
  </template>
  
  <script setup>
  import Card from '@/components/Card.vue'
  import Tabs from '@/components/Tabs.vue'
  
  const tabs = [
    {
      key: 'in-progress',
      title: 'Tasks In Progress',
      description: 'View all tasks currently being worked on. Total: 7 tasks in progress.',
      items: [
        { name: 'Frontend Dashboard Implementation', progress: 75 },
        { name: 'API Integration for User Authentication', progress: 60 },
        { name: 'Database Schema Design', progress: 90 },
        { name: 'User Profile Page', progress: 45 },
        { name: 'Notification System', progress: 30 },
      ]
    },
    {
      key: 'completed-requirements',
      title: 'Completed Requirements',
      description: 'View all requirements that have been completed. Total: 12 requirements completed.',
      items: [
        { name: 'User Authentication System', date: 'Apr 15, 2025' },
        { name: 'Task Creation Interface', date: 'Apr 12, 2025' },
        { name: 'Project Dashboard Layout', date: 'Apr 10, 2025' },
        { name: 'Email Notification System', date: 'Apr 8, 2025' },
        { name: 'User Role Management', date: 'Apr 5, 2025' },
      ]
    },
    {
      key: 'completed-tasks',
      title: 'Completed Tasks',
      description: 'View all tasks that have been completed. Total: 15 tasks completed.',
      items: [
        { name: 'Login Page Design', date: 'Apr 18, 2025' },
        { name: 'User Registration Form', date: 'Apr 16, 2025' },
        { name: 'Password Reset Functionality', date: 'Apr 14, 2025' },
        { name: 'Navigation Menu Implementation', date: 'Apr 12, 2025' },
        { name: 'Project Card Component', date: 'Apr 10, 2025' },
      ]
    },
  ]
  </script>
  
  <style scoped>
  /* Add any scoped styles if necessary */
  </style>
  