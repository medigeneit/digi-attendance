<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { getTreeList } from '@/libs/task-tree.js'
import { computed } from 'vue'

const props = defineProps({
  tasks: Array,
})

const users = computed(() => {
  return props.tasks.reduce((users, task) => {
    users.push(...task.users.filter((tu) => !users.find((u) => u.id == tu.id)))
    return users
  }, [])
})

const getUserAllTasks = (userId) => {
  const tasks = props.tasks
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const visited = new Set()
  const result = []

  // Step 1: Find tasks explicitly assigned to the given user
  const userTasks = tasks.filter((t) => t.users.some((u) => u.id === userId))

  for (const task of userTasks) {
    if (!visited.has(task.id)) {
      visited.add(task.id)
      result.push(task)
    }

    // Step 2: Climb up the tree and include parent tasks (even if from another user)
    let parentId = task.parent_id
    while (parentId && taskMap.has(parentId) && !visited.has(parentId)) {
      const parentTask = taskMap.get(parentId)
      visited.add(parentTask.id)
      result.push(parentTask)
      parentId = parentTask.parent_id
    }
  }

  return result
}

const taskUsers = computed(() => {
  return users.value.map((u) => {
    const tasks = getTreeList(getUserAllTasks(u.id), 0)
    return { ...u, ...{ tasks } }
  })
})
</script>

<template>
  <div>
    <table class="w-full bg-white rounded">
      <tbody>
        <template v-for="taskUser in taskUsers" :key="taskUser.id">
          <tr v-for="(task, taskIndex) in taskUser.tasks" :key="task.id">
            <td
              class="border p-4 align-top"
              v-if="taskIndex == 0"
              :rowspan="Math.max(taskUser.tasks.length, 1)"
            >
              <div
                class="flex items-center gap-2 border rounded-full px-1 py-0.5 bg-slate-100 shadow-sm"
              >
                <UserAvatar :user="taskUser" class="w-6 h-6 !text-xs" />
                <span class="text-xs text-gray-700 mr-2 hidden md:inline"
                  >{{ taskUser.id }} - {{ taskUser?.name }}</span
                >
              </div>
            </td>

            <td class="border p-4">
              {{ taskIndex + 1 }}
            </td>
            <td class="">
              <TaskTreeView :task="task" class="!border-0" />
              <!-- #{{ task.id }} - {{ task.title }} -->
            </td>
            <!-- <td class="border p-4">
              {{ task.parent_id }}
            </td>
            <td class="border p-4">
              {{ task.users.find((tu) => tu.id == taskUser.id)?.name }}
            </td>
            <td class="border p-4"></td>
            <td class="border p-4"></td> -->
          </tr>
        </template>
      </tbody>
    </table>
  </div>
  <!-- <pre>{{ userTasks }}</pre>
  <pre>{{ users }}</pre>
  <pre>{{ tasks }}</pre> -->
</template>
