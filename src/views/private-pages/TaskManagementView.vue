<!-- <script setup></script>

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
</template> -->

<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <!-- Main Content -->
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Task Management</h1>
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
        <RouterLink :to="{ name: 'ProjectList' }">
          <DashboardCard
            title="Projects"
            :value="summary.projects?.total"
            :subtext="`${summary?.projects?.active} active projects`"
            icon="folder"
            color="text-cyan-500"
          />
        </RouterLink>
        <RouterLink :to="{ name: 'RequirementList' }">
          <DashboardCard
            title="Requirements"
            :value="summary?.requirements?.total"
            :subtext="`${summary?.requirements?.completed} completed`"
            icon="file-alt"
            color="text-indigo-500"
          />
        </RouterLink>

        <RouterLink :to="{ name: 'TaskList' }">
          <DashboardCard
            title="Tasks"
            :value="summary?.tasks?.total"
            :subtext="`${summary?.tasks?.in_progress} in progress`"
            icon="tasks"
            color="text-purple-500"
          />
        </RouterLink>

        <RouterLink :to="{ name: 'BugList' }">
          <DashboardCard
            title="Bugs"
            :value="summary?.bugs?.total"
            :subtext="`${summary?.bugs?.critical} critical`"
            icon="bug"
            color="text-red-500"
          />
        </RouterLink>

        <RouterLink :to="{ name: 'MeetingList' }">
          <DashboardCard
            title="Meetings"
            :value="summary?.meetings?.total"
            :subtext="`${summary?.meetings?.today} today`"
            icon="users"
            color="text-teal-500"
          />
        </RouterLink>
      </div>
      <Tabs />
    </main>
  </div>
</template>

<script setup>
import DashboardCard from '@/components/DashboardCard.vue'
import Tabs from '@/components/Tabs.vue'
import { useProjectStore } from '@/stores/useProjectStore'
import { onMounted, ref } from 'vue'

const summary = ref({})

const projectStore = useProjectStore()

onMounted(async () => {
  try {
    const response = await projectStore.fetchTaskManagementSummary()
    summary.value = response.data
  } catch (error) {
    console.error('Failed to fetch summary:', error)
  }
})
</script>
