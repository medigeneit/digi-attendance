<template>
  <div class="space-y-4">
    <div class="flex gap-2 border rounded-md bg-white p-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="[
          'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
          activeTab === tab.value
            ? 'bg-blue-600 text-white shadow'
            : 'text-gray-600 hover:bg-gray-100',
        ]"
      >
        <i :class="['fas', tab.icon, 'text-sm']" />
        {{ tab.label }}
      </button>
    </div>

    <div class="bg-white rounded-lg p-4 shadow">
      <component :is="tabComponents[activeTab]" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ✅ Import actual tab components
import BugsTab from '@/components/BugsTab.vue'
import MeetingsTab from '@/components/MeetingsTab.vue'
import ProjectsTab from '@/components/ProjectsTab.vue'
import RequirementsTab from '@/components/RequirementsTab.vue'
import TasksTab from '@/components/TasksTab.vue'

const tabs = [
  { label: 'Projects', value: 'projects', icon: 'fa-folder' },
  { label: 'Requirements', value: 'requirements', icon: 'fa-file-alt' },
  { label: 'Tasks', value: 'tasks', icon: 'fa-tasks' },
  { label: 'Bugs', value: 'bugs', icon: 'fa-bug' },
  { label: 'Meetings', value: 'meetings', icon: 'fa-users' },
]

const activeTab = ref('projects')

const tabComponents = {
  projects: ProjectsTab,
  requirements: RequirementsTab,
  tasks: TasksTab,
  bugs: BugsTab,
  meetings: MeetingsTab,
}
</script>

<style scoped>
button:focus {
  outline: none;
}
</style>
