<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Bug Tracking</h2>
    <div class="space-y-4">
      <div
        v-for="bug in bugs"
        :key="bug.id"
        class="rounded-lg border bg-white p-4 shadow hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-500">{{ bug.id }}</span>
              <span
                class="text-xs font-semibold px-2 py-1 rounded text-white"
                :class="severityClass(bug.severity)"
              >
                {{ bug.severity }}
              </span>
              <span
                class="text-xs font-medium px-2 py-1 rounded border"
                :class="statusClass(bug.status)"
              >
                {{ bug.status }}
              </span>
            </div>
            <h3 class="font-medium text-gray-800">{{ bug.title }}</h3>
            <p class="text-sm text-gray-500">Project: {{ bug.project }}</p>
            <p class="text-xs text-gray-500">
              Reported by: <strong>{{ bug.reportedBy }}</strong>
              <span v-if="bug.assignedTo !== 'Unassigned'">
                | Assigned to: <strong>{{ bug.assignedTo }}</strong></span
              >
            </p>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-400">Reported: {{ bug.reportedDate }}</div>
            <button class="mt-2 px-3 py-1 text-xs border rounded hover:bg-gray-100">View</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const bugs = [
  {
    id: 'BUG-001',
    title: 'Login form validation error',
    project: 'E-commerce Platform',
    severity: 'Critical',
    status: 'Open',
    reportedBy: 'John Doe',
    assignedTo: 'Sarah Johnson',
    reportedDate: 'Apr 20, 2025',
  },
  {
    id: 'BUG-002',
    title: 'Product images not loading',
    project: 'E-commerce Platform',
    severity: 'High',
    status: 'In Progress',
    reportedBy: 'Emily Taylor',
    assignedTo: 'Mike Chen',
    reportedDate: 'Apr 19, 2025',
  },
  {
    id: 'BUG-003',
    title: 'Cart calculation error',
    project: 'E-commerce Platform',
    severity: 'Critical',
    status: 'Open',
    reportedBy: 'Alex Wong',
    assignedTo: 'Unassigned',
    reportedDate: 'Apr 21, 2025',
  },
]

const severityClass = (severity) => {
  switch (severity) {
    case 'Critical':
      return 'bg-red-600'
    case 'High':
      return 'bg-orange-500'
    case 'Medium':
      return 'bg-yellow-500'
    case 'Low':
      return 'bg-gray-500'
    default:
      return 'bg-gray-300'
  }
}

const statusClass = (status) => {
  switch (status) {
    case 'Open':
      return 'border-blue-500 text-blue-500'
    case 'In Progress':
      return 'border-yellow-500 text-yellow-500'
    case 'Resolved':
      return 'border-green-500 text-green-500'
    default:
      return 'border-gray-300 text-gray-400'
  }
}
</script>
