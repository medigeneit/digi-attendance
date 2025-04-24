<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <!-- Main Content -->
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            Task Management
          </h1>
          <p class="text-sm text-gray-500">
            Manage your projects, requirements, tasks, bugs, and meetings.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-md border px-3 py-2 text-sm flex items-center gap-1">
            <i class="fas fa-calendar-alt text-sm" /> Calendar View
          </button>
          <button
            class="rounded-md bg-blue-600 text-white px-3 py-2 text-sm flex items-center gap-1"
          >
            <i class="fas fa-plus text-sm" /> New Task
          </button>
        </div>
      </div>

      <!-- Dashboard Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <DashboardCard
          title="Projects"
          value="8"
          subtext="3 active projects"
          icon="folder"
          color="text-cyan-500"
        />
        <DashboardCard
          title="Requirements"
          value="24"
          subtext="12 completed"
          icon="file-alt"
          color="text-indigo-500"
        />
        <DashboardCard
          title="Tasks"
          value="42"
          subtext="7 in progress"
          icon="tasks"
          color="text-purple-500"
        />
        <DashboardCard
          title="Bugs"
          value="12"
          subtext="3 critical"
          icon="bug"
          color="text-red-500"
        />
        <DashboardCard
          title="Meetings"
          value="5"
          subtext="2 today"
          icon="users"
          color="text-teal-500"
        />
      </div>
      <Tabs />
    </main>
  </div>
</template>

<script setup>
import DashboardCard from '@/components/DashboardCard.vue'
import Tabs from '@/components/Tabs.vue'
</script>
